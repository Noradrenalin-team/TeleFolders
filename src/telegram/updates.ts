import { getMarkedPeerId } from '@mtcute/web'
import type { tl } from '@mtcute/web'
import { getClient } from '#/telegram/client'
import { computeChatFolders } from '#/telegram/mappers'
import type { Chat } from '#/telegram/types'

/** What an incoming Telegram update means for the app's cached data. */
export type ChatChange =
  /** Folders were created/edited/deleted/reordered in another client. */
  | { kind: 'folders' }
  /** One chat's own state changed. */
  | { kind: 'chat'; id: number; patch: ChatPatch }
  /** A new incoming message: one more unread, if the chat is known. */
  | { kind: 'unread+1'; id: number }

export type ChatPatch = Partial<
  Pick<Chat, 'isArchived' | 'isPinned' | 'isMuted' | 'unreadCount'>
>

// Main list vs. archive, as folder ids in `folders.editPeerFolders`.
const ARCHIVE_FOLDER_ID = 1

/**
 * Maps one raw update to the changes it implies (ТЗ §2 "изменения из
 * официального клиента приезжают сами"). Anything else — typing, reactions,
 * edits — is irrelevant to the matrix and ignored.
 */
export function changesFromUpdate(
  update: tl.TypeUpdate,
  nowSec: number,
): ChatChange[] {
  switch (update._) {
    case 'updateDialogFilter':
    case 'updateDialogFilters':
    case 'updateDialogFilterOrder':
      return [{ kind: 'folders' }]

    case 'updateFolderPeers':
      return update.folderPeers.map((folderPeer) => ({
        kind: 'chat',
        id: getMarkedPeerId(folderPeer.peer),
        patch: { isArchived: folderPeer.folderId === ARCHIVE_FOLDER_ID },
      }))

    case 'updateDialogPinned':
      if (update.peer._ !== 'dialogPeer') return []
      return [
        {
          kind: 'chat',
          id: getMarkedPeerId(update.peer.peer),
          patch: { isPinned: Boolean(update.pinned) },
        },
      ]

    case 'updateNotifySettings': {
      if (update.peer._ !== 'notifyPeer') return []
      const muteUntil = update.notifySettings.muteUntil ?? 0
      return [
        {
          kind: 'chat',
          id: getMarkedPeerId(update.peer.peer),
          patch: { isMuted: muteUntil > nowSec },
        },
      ]
    }

    case 'updateReadHistoryInbox':
      // A topic's read state isn't the chat's own counter.
      if (update.topMsgId) return []
      return [
        {
          kind: 'chat',
          id: getMarkedPeerId(update.peer),
          patch: { unreadCount: update.stillUnreadCount },
        },
      ]

    case 'updateReadChannelInbox':
      return [
        {
          kind: 'chat',
          id: getMarkedPeerId({
            _: 'peerChannel',
            channelId: update.channelId,
          }),
          patch: { unreadCount: update.stillUnreadCount },
        },
      ]

    case 'updateNewMessage':
    case 'updateNewChannelMessage': {
      const message = update.message
      if (message._ !== 'message' || message.out) return []
      return [{ kind: 'unread+1', id: getMarkedPeerId(message.peerId) }]
    }

    default:
      return []
  }
}

/**
 * Starts mtcute's updates loop (it doesn't run until asked) and forwards
 * the changes that matter. Returns an unsubscribe function; the loop itself
 * stops with the client on sign-out.
 */
export async function subscribeToChanges(
  onChanges: (changes: ChatChange[]) => void,
): Promise<() => void> {
  const client = getClient()
  const listener = (info: { update: tl.TypeUpdate }) => {
    const changes = changesFromUpdate(
      info.update,
      Math.floor(Date.now() / 1000),
    )
    if (changes.length > 0) onChanges(changes)
  }
  client.onRawUpdate.add(listener)
  await client.startUpdatesLoop()
  return () => client.onRawUpdate.remove(listener)
}

/**
 * Re-derives every chat's folder relations from the current filters — cheap
 * (one `getFolders`), unlike re-listing all dialogs, and it's all that
 * changes for a chat when a folder is edited or deleted elsewhere.
 */
export async function refreshChatFolders(chats: Chat[]): Promise<Chat[]> {
  const client = getClient()
  const { filters } = await client.getFolders()
  const selfId = client.storage.self.getCached()?.userId
  return chats.map((chat) => ({
    ...chat,
    folders: computeChatFolders(chat.id, filters, selfId),
  }))
}

export type ConnectionState =
  'offline' | 'connecting' | 'updating' | 'connected'

/** F9.2: the MTProto connection's state, for the "reconnecting" banner. */
export function subscribeConnectionState(
  listener: (state: ConnectionState) => void,
): () => void {
  const client = getClient()
  client.onConnectionState.add(listener)
  return () => client.onConnectionState.remove(listener)
}
