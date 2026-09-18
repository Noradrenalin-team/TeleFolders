import { getMarkedPeerId } from '@mtcute/web'
import type { tl, Dialog, Peer } from '@mtcute/web'
import type {
  Chat,
  ChatFolderRelation,
  Folder,
  FolderFlag,
  PeerKind,
} from '#/telegram/types'

/**
 * Marked peer id (see `Chat.id`/`PeerRef.id` in `#/telegram/types`) for any
 * `InputPeer` variant that can appear in a `DialogFilter`'s peer lists. This
 * is the same id `Dialog.peer.id` exposes, so a chat and a folder entry can
 * be compared directly, without ever needing to resolve an access hash.
 *
 * `inputPeerSelf` doesn't carry an id of its own and needs `selfId` to
 * resolve; without it — or for `inputPeerEmpty` — the entry can't be matched
 * against a specific chat, so `undefined` is returned rather than throwing
 * and failing the whole read (ТЗ §3.1).
 */
export function peerKey(
  peer: tl.TypeInputPeer,
  selfId?: number,
): number | undefined {
  if (peer._ === 'inputPeerSelf') return selfId
  if (peer._ === 'inputPeerEmpty') return undefined
  try {
    return getMarkedPeerId(peer)
  } catch {
    return undefined
  }
}

function peerKindFromPeer(peer: Peer): PeerKind {
  if (peer.type === 'user') {
    if (peer.isSelf) return 'saved'
    if (peer.isBot) return 'bot'
    return 'user'
  }
  switch (peer.chatType) {
    case 'group':
      return 'group'
    case 'supergroup':
      return 'supergroup'
    default:
      // channel, gigagroup, monoforum, community — all behave like a
      // broadcast channel for our purposes (no free-form messaging).
      return 'channel'
  }
}

function rawPeerId(raw: tl.TypePeer): number {
  switch (raw._) {
    case 'peerUser':
      return raw.userId
    case 'peerChat':
      return raw.chatId
    case 'peerChannel':
      return raw.channelId
  }
}

function computeCapabilities(
  kind: PeerKind,
): Pick<Chat, 'canDelete' | 'canLeave' | 'canBlock'> {
  if (kind === 'saved')
    return { canDelete: true, canLeave: false, canBlock: false }
  if (kind === 'user' || kind === 'bot')
    return { canDelete: true, canLeave: false, canBlock: true }
  return { canDelete: false, canLeave: true, canBlock: false }
}

/**
 * Given a chat's marked peer id and the raw folder list, figures out its
 * relation to every editable/chatlist folder. `pinned` implies `include`
 * (ТЗ §3.3): a peer present in both `pinnedPeers` and `includePeers` is
 * reported once, as `pinned`.
 */
export function computeChatFolders(
  chatId: number,
  filters: ReadonlyArray<tl.TypeDialogFilter>,
  selfId: number | undefined,
): Record<number, ChatFolderRelation> {
  const result: Record<number, ChatFolderRelation> = {}

  for (const filter of filters) {
    if (filter._ === 'dialogFilterDefault') continue

    if (filter.pinnedPeers.some((p) => peerKey(p, selfId) === chatId)) {
      result[filter.id] = 'pinned'
    } else if (filter.includePeers.some((p) => peerKey(p, selfId) === chatId)) {
      result[filter.id] = 'include'
    } else if (
      filter._ === 'dialogFilter' &&
      filter.excludePeers.some((p) => peerKey(p, selfId) === chatId)
    ) {
      result[filter.id] = 'exclude'
    }
  }

  return result
}

export function mapDialogToChat(
  dialog: Dialog,
  filters: ReadonlyArray<tl.TypeDialogFilter>,
  selfId: number | undefined,
): Chat {
  const peer = dialog.peer
  const kind = peerKindFromPeer(peer)

  return {
    id: peer.id,
    peerId: rawPeerId(dialog.raw.peer),
    kind,
    title: peer.type === 'user' ? peer.displayName : peer.title,
    username: peer.username ?? undefined,
    isPinned: dialog.isPinned,
    isArchived: dialog.isArchived,
    isMuted: dialog.isMuted ?? false,
    unreadCount: dialog.unreadCount,
    isSelf: kind === 'saved',
    folders: computeChatFolders(peer.id, filters, selfId),
    ...computeCapabilities(kind),
  }
}

const EMPTY_FLAGS: Record<FolderFlag, boolean> = {
  contacts: false,
  nonContacts: false,
  groups: false,
  broadcasts: false,
  bots: false,
  excludeMuted: false,
  excludeRead: false,
  excludeArchived: false,
}

/** Number of distinct chats a folder actually contains (ТЗ §3.4: "папка не
 * может быть пустой"). `include` and `pinned` are two different lists for
 * the same membership — a peer can be in both at once — so this counts the
 * union, not the sum. */
function countUniquePeers(
  lists: ReadonlyArray<ReadonlyArray<tl.TypeInputPeer>>,
  selfId: number | undefined,
): number {
  const keys = new Set<number>()
  for (const list of lists) {
    for (const peer of list) {
      const key = peerKey(peer, selfId)
      if (key !== undefined) keys.add(key)
    }
  }
  return keys.size
}

export function mapFilterToFolder(
  filter: tl.RawDialogFilter | tl.RawDialogFilterChatlist,
  selfId?: number,
): Folder {
  const isEditable = filter._ === 'dialogFilter'

  return {
    id: filter.id,
    title: filter.title.text,
    emoticon: filter.emoticon,
    flags: isEditable
      ? {
          contacts: Boolean(filter.contacts),
          nonContacts: Boolean(filter.nonContacts),
          groups: Boolean(filter.groups),
          broadcasts: Boolean(filter.broadcasts),
          bots: Boolean(filter.bots),
          excludeMuted: Boolean(filter.excludeMuted),
          excludeRead: Boolean(filter.excludeRead),
          excludeArchived: Boolean(filter.excludeArchived),
        }
      : EMPTY_FLAGS,
    includeCount: countUniquePeers(
      [filter.includePeers, filter.pinnedPeers],
      selfId,
    ),
    excludeCount: isEditable ? filter.excludePeers.length : 0,
    pinnedCount: filter.pinnedPeers.length,
    readOnly: !isEditable,
  }
}
