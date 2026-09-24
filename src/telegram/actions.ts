import { getMarkedPeerId } from '@mtcute/web'
import type { tl } from '@mtcute/web'
import { getClient } from '#/telegram/client'
import { withFloodWaitRetry } from '#/telegram/errors'
import type { BlockedPeer, PeerKind, PeerRef } from '#/telegram/types'

export async function setArchived(
  peer: PeerRef,
  archived: boolean,
): Promise<void> {
  const client = getClient()
  if (archived) {
    await client.archiveChats(peer.id)
  } else {
    await client.unarchiveChats(peer.id)
  }
}

/** Archives many chats in one `folders.editPeerFolders` call (F6). */
export async function setArchivedMany(
  peers: ReadonlyArray<PeerRef>,
  archived: boolean,
): Promise<void> {
  const client = getClient()
  const ids = peers.map((peer) => peer.id)
  await withFloodWaitRetry(() =>
    archived ? client.archiveChats(ids) : client.unarchiveChats(ids),
  )
}

/** Global chat pin, separate from per-folder pinning (F5.2/F4.5, `messages.toggleDialogPin`). */
export async function setPinned(peer: PeerRef, pinned: boolean): Promise<void> {
  const client = getClient()
  const inputPeer = await client.resolvePeer(peer.id)
  await client.call({
    _: 'messages.toggleDialogPin',
    pinned,
    peer: { _: 'inputDialogPeer', peer: inputPeer },
  })
}

// Telegram's own "mute forever" value: max int32 unix time.
const MUTE_FOREVER = 2 ** 31 - 1

export async function setMuted(peer: PeerRef, muted: boolean): Promise<void> {
  const client = getClient()
  const inputPeer = await client.resolvePeer(peer.id)
  await withFloodWaitRetry(() =>
    client.call({
      _: 'account.updateNotifySettings',
      peer: { _: 'inputNotifyPeer', peer: inputPeer },
      settings: {
        _: 'inputPeerNotifySettings',
        muteUntil: muted ? MUTE_FOREVER : 0,
      },
    }),
  )
}

export async function markRead(peer: PeerRef): Promise<void> {
  await withFloodWaitRetry(() =>
    getClient().readHistory(peer.id, { clearMentions: true }),
  )
}

/**
 * "Delete" for chats that can be deleted rather than left (ТЗ §3 table):
 * a DM (optionally for both sides), a bot (optionally blocking it first, so
 * it's "stopped"), or Saved Messages (history only — the dialog itself
 * can't go away).
 */
export async function deleteChat(
  peer: PeerRef,
  options: { revoke?: boolean; block?: boolean } = {},
): Promise<void> {
  const client = getClient()

  if (peer.kind === 'saved') {
    await deleteHistoryFully(peer, 'clear')
    return
  }
  if (peer.kind !== 'user' && peer.kind !== 'bot') {
    throw new Error(`deleteChat: unsupported peer kind "${peer.kind}"`)
  }

  if (peer.kind === 'bot' && options.block) {
    await withFloodWaitRetry(() => client.blockUser(peer.id))
  }
  const mode = peer.kind === 'user' && options.revoke ? 'revoke' : 'delete'
  await deleteHistoryFully(peer, mode)
}

/**
 * `messages.deleteHistory` works in batches: a positive `offset` in the
 * result means "call again" (mtcute's `deleteHistory` makes only one call,
 * which leaves a long chat half-deleted).
 */
async function deleteHistoryFully(
  peer: PeerRef,
  mode: 'delete' | 'clear' | 'revoke',
): Promise<void> {
  const client = getClient()
  const inputPeer = await client.resolvePeer(peer.id)
  for (;;) {
    const res = await withFloodWaitRetry(() =>
      client.call({
        _: 'messages.deleteHistory',
        peer: inputPeer,
        maxId: 0,
        justClear: mode === 'clear',
        revoke: mode === 'revoke',
      }),
    )
    if (res.offset <= 0) return
  }
}

/** Leave a group/supergroup or unsubscribe from a channel. For a legacy
 * group the history is cleared too, so the dialog leaves the list the same
 * way it does for a channel. */
export async function leaveChat(peer: PeerRef): Promise<void> {
  if (
    peer.kind !== 'group' &&
    peer.kind !== 'supergroup' &&
    peer.kind !== 'channel'
  ) {
    throw new Error(`leaveChat: unsupported peer kind "${peer.kind}"`)
  }
  await withFloodWaitRetry(() => getClient().leaveChat(peer.id))
  if (peer.kind === 'group') await deleteHistoryFully(peer, 'delete')
}

export async function blockUser(peer: Pick<PeerRef, 'id'>): Promise<void> {
  await withFloodWaitRetry(() => getClient().blockUser(peer.id))
}

export async function unblockUser(peer: Pick<PeerRef, 'id'>): Promise<void> {
  await withFloodWaitRetry(() => getClient().unblockUser(peer.id))
}

const BLOCKED_PAGE_SIZE = 100

export async function listBlocked(): Promise<BlockedPeer[]> {
  const client = getClient()
  const result: BlockedPeer[] = []

  for (let offset = 0; ; offset += BLOCKED_PAGE_SIZE) {
    const page = await withFloodWaitRetry(() =>
      client.call({
        _: 'contacts.getBlocked',
        offset,
        limit: BLOCKED_PAGE_SIZE,
      }),
    )
    result.push(...mapBlocked(page))

    const total =
      page._ === 'contacts.blockedSlice' ? page.count : result.length
    if (page.blocked.length < BLOCKED_PAGE_SIZE || result.length >= total) {
      return result
    }
  }
}

export function mapBlocked(page: tl.contacts.TypeBlocked): BlockedPeer[] {
  const users = new Map(page.users.map((u) => [u.id, u]))
  const chats = new Map(page.chats.map((c) => [c.id, c]))

  return page.blocked.flatMap((entry): BlockedPeer[] => {
    const raw = entry.peerId
    const id = getMarkedPeerId(raw)

    if (raw._ === 'peerUser') {
      const user = users.get(raw.userId)
      if (!user || user._ !== 'user') return [{ id, kind: 'user', title: '' }]
      const title = [user.firstName, user.lastName].filter(Boolean).join(' ')
      return [
        {
          id,
          kind: user.bot ? 'bot' : 'user',
          title,
          username: user.username ?? undefined,
        },
      ]
    }

    const chatId = raw._ === 'peerChat' ? raw.chatId : raw.channelId
    const chat = chats.get(chatId)
    const kind: PeerKind =
      raw._ === 'peerChat'
        ? 'group'
        : chat?._ === 'channel' && chat.megagroup
          ? 'supergroup'
          : 'channel'
    const title = chat && 'title' in chat ? chat.title : ''
    const username =
      chat?._ === 'channel' ? (chat.username ?? undefined) : undefined
    return [{ id, kind, title, username }]
  })
}
