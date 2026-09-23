import { chatActionsFor } from '#/features/chat-actions/chat-actions'
import { hasAnyCategoryFlag } from '#/features/matrix/relation-cycle'
import type { Chat, Folder } from '#/telegram/types'

export type BulkFolderAction = {
  type: 'folder'
  folder: Folder
  /** `null` clears the chat's relation to the folder. */
  relation: 'include' | 'exclude' | null
}

export type BulkChatAction = {
  type:
    | 'archive'
    | 'unarchive'
    | 'mute'
    | 'unmute'
    | 'markRead'
    | 'leave'
    | 'delete'
    | 'block'
}

export type BulkAction = BulkFolderAction | BulkChatAction

/** Needs the F6.4 confirmation listing affected chats. */
export function isDestructiveBulk(action: BulkAction): boolean {
  return (
    action.type === 'leave' ||
    action.type === 'delete' ||
    action.type === 'block'
  )
}

/**
 * Whether `action` would change anything for `chat` — selected chats it
 * doesn't apply to (leaving a DM, muting a muted chat, deleting Saved
 * Messages) are skipped up front rather than sent and failed.
 */
export function appliesTo(
  action: BulkAction,
  chat: Chat,
  { isBlocked = false }: { isBlocked?: boolean } = {},
): boolean {
  switch (action.type) {
    case 'folder': {
      if (action.folder.readOnly) return false
      const current = chat.folders[action.folder.id]
      if (action.relation === 'include') {
        return current !== 'include' && current !== 'pinned'
      }
      if (action.relation === 'exclude') return current !== 'exclude'
      return current !== undefined
    }
    case 'archive':
      return !chat.isArchived
    case 'unarchive':
      return chat.isArchived
    case 'mute':
      return !chat.isMuted
    case 'unmute':
      return chat.isMuted
    case 'markRead':
      return chat.unreadCount > 0
    case 'leave':
    case 'delete':
    case 'block':
      return chatActionsFor(chat, { isBlocked }).destructive.includes(
        action.type,
      )
  }
}

/**
 * F2.7 for a bulk write: removing every explicitly included chat from a
 * folder with no category flag would leave it empty, which Telegram
 * rejects — catch it before sending.
 */
export function bulkWouldEmptyFolder(
  action: BulkFolderAction,
  chats: readonly Chat[],
): boolean {
  if (action.relation === 'include') return false
  if (hasAnyCategoryFlag(action.folder)) return false
  const removed = chats.filter((chat) => {
    const current = chat.folders[action.folder.id]
    return current === 'include' || current === 'pinned'
  }).length
  return removed > 0 && action.folder.includeCount - removed <= 0
}
