import type { tl, Dialog, Peer } from '@mtcute/web'
import type {
  Chat,
  ChatFolderRelation,
  Folder,
  FolderFlag,
  PeerKind,
} from '#/telegram/types'

/** Normalizes any `InputPeer` variant to a comparable key, regardless of dialog vs. folder-list origin. */
export function peerKey(peer: tl.TypeInputPeer): string {
  switch (peer._) {
    case 'inputPeerUser':
      return `user:${peer.userId}`
    case 'inputPeerChat':
      return `chat:${peer.chatId}`
    case 'inputPeerChannel':
      return `channel:${peer.channelId}`
    default:
      return peer._
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
 * Given a chat's peer key and the raw folder list, figures out its relation
 * to every editable/chatlist folder. `pinned` implies `include` (ТЗ §3.3):
 * a peer present in both `pinnedPeers` and `includePeers` is reported once,
 * as `pinned`.
 */
export function computeChatFolders(
  key: string,
  filters: ReadonlyArray<tl.TypeDialogFilter>,
): Record<number, ChatFolderRelation> {
  const result: Record<number, ChatFolderRelation> = {}

  for (const filter of filters) {
    if (filter._ === 'dialogFilterDefault') continue

    if (filter.pinnedPeers.some((p) => peerKey(p) === key)) {
      result[filter.id] = 'pinned'
    } else if (filter.includePeers.some((p) => peerKey(p) === key)) {
      result[filter.id] = 'include'
    } else if (
      filter._ === 'dialogFilter' &&
      filter.excludePeers.some((p) => peerKey(p) === key)
    ) {
      result[filter.id] = 'exclude'
    }
  }

  return result
}

export function mapDialogToChat(
  dialog: Dialog,
  filters: ReadonlyArray<tl.TypeDialogFilter>,
): Chat {
  const peer = dialog.peer
  const kind = peerKindFromPeer(peer)
  const key = peerKey(peer.inputPeer)

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
    folders: computeChatFolders(key, filters),
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

export function mapFilterToFolder(
  filter: tl.RawDialogFilter | tl.RawDialogFilterChatlist,
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
    includeCount: filter.includePeers.length,
    excludeCount: isEditable ? filter.excludePeers.length : 0,
    pinnedCount: filter.pinnedPeers.length,
    readOnly: !isEditable,
  }
}
