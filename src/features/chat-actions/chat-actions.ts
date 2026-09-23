import type { Chat } from '#/telegram/types'

export type ChatAction =
  | 'pin'
  | 'unpin'
  | 'archive'
  | 'unarchive'
  | 'mute'
  | 'unmute'
  | 'markRead'
  | 'openInTelegram'
  | 'delete'
  | 'clearHistory'
  | 'leave'
  | 'block'

/** Actions that need a confirmation dialog before anything is sent (F5.3). */
export type DestructiveChatAction = Extract<
  ChatAction,
  'delete' | 'clearHistory' | 'leave' | 'block'
>

export function isDestructive(
  action: ChatAction,
): action is DestructiveChatAction {
  return (
    action === 'delete' ||
    action === 'clearHistory' ||
    action === 'leave' ||
    action === 'block'
  )
}

/**
 * The F5.1 menu for one chat, in display order, split into the safe part
 * and the destructive part (rendered after a separator). Which destructive
 * entries exist follows the ТЗ §3 table: Saved Messages can only be
 * cleared, DMs/bots are deleted, groups/channels are left.
 */
export function chatActionsFor(chat: Chat): {
  safe: ChatAction[]
  destructive: DestructiveChatAction[]
} {
  const safe: ChatAction[] = [
    chat.isPinned ? 'unpin' : 'pin',
    chat.isArchived ? 'unarchive' : 'archive',
    chat.isMuted ? 'unmute' : 'mute',
  ]
  if (chat.unreadCount > 0) safe.push('markRead')
  if (telegramLink(chat)) safe.push('openInTelegram')

  const destructive: DestructiveChatAction[] = []
  if (chat.isSelf) {
    destructive.push('clearHistory')
  } else {
    if (chat.canDelete) destructive.push('delete')
    // Telegram refuses to let a channel's creator leave it (`USER_CREATOR`);
    // the official client only offers deleting the channel, which is F5.8.
    const ownsChannel = chat.kind === 'channel' && chat.isOwner
    if (chat.canLeave && !ownsChannel) destructive.push('leave')
    if (chat.canBlock) destructive.push('block')
  }

  return { safe, destructive }
}

/** Deep link that opens the chat in an installed Telegram client, if one can
 * be built without extra API calls. */
export function telegramLink(
  chat: Pick<Chat, 'kind' | 'username' | 'peerId'>,
): string | undefined {
  if (chat.username) return `https://t.me/${chat.username}`
  if (chat.kind === 'user' || chat.kind === 'bot') {
    return `tg://user?id=${chat.peerId}`
  }
  return undefined
}
