import {
  Archive,
  ArchiveRestore,
  Ban,
  Bell,
  BellOff,
  CheckCheck,
  Eraser,
  ExternalLink,
  LogOut,
  MoreHorizontal,
  Pin,
  PinOff,
  Trash2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '#/components/ui/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Button } from '#/components/ui/button'
import { chatActionsFor } from '#/features/chat-actions/chat-actions'
import type { ChatAction } from '#/features/chat-actions/chat-actions'
import type { Chat } from '#/telegram/types'
import { m } from '#/paraglide/messages'

const ICONS: Record<ChatAction, LucideIcon> = {
  pin: Pin,
  unpin: PinOff,
  archive: Archive,
  unarchive: ArchiveRestore,
  mute: BellOff,
  unmute: Bell,
  markRead: CheckCheck,
  openInTelegram: ExternalLink,
  delete: Trash2,
  clearHistory: Eraser,
  leave: LogOut,
  block: Ban,
}

export function chatActionLabel(action: ChatAction, chat: Chat): string {
  switch (action) {
    case 'pin':
      return m.chat_action_pin()
    case 'unpin':
      return m.chat_action_unpin()
    case 'archive':
      return m.chat_action_archive()
    case 'unarchive':
      return m.chat_action_unarchive()
    case 'mute':
      return m.chat_action_mute()
    case 'unmute':
      return m.chat_action_unmute()
    case 'markRead':
      return m.chat_action_mark_read()
    case 'openInTelegram':
      return m.chat_action_open_in_telegram()
    case 'delete':
      return chat.kind === 'bot'
        ? m.chat_action_delete_bot()
        : m.chat_action_delete()
    case 'clearHistory':
      return m.chat_action_clear_history()
    case 'leave':
      return chat.kind === 'channel'
        ? m.chat_action_unsubscribe()
        : m.chat_action_leave()
    case 'block':
      return chat.kind === 'bot'
        ? m.chat_action_block_bot()
        : m.chat_action_block()
  }
}

type ItemComponent = typeof DropdownMenuItem | typeof ContextMenuItem
type SeparatorComponent =
  typeof DropdownMenuSeparator | typeof ContextMenuSeparator

function ChatActionItems({
  chat,
  onAction,
  Item,
  Separator,
}: {
  chat: Chat
  onAction: (chat: Chat, action: ChatAction) => void
  Item: ItemComponent
  Separator: SeparatorComponent
}) {
  const { safe, destructive } = chatActionsFor(chat)

  const renderItem = (
    action: ChatAction,
    variant: 'default' | 'destructive',
  ) => {
    const Icon = ICONS[action]
    return (
      <Item
        key={action}
        variant={variant}
        onSelect={() => onAction(chat, action)}
      >
        <Icon aria-hidden="true" />
        {chatActionLabel(action, chat)}
      </Item>
    )
  }

  return (
    <>
      {safe.map((action) => renderItem(action, 'default'))}
      {destructive.length > 0 && <Separator />}
      {destructive.map((action) => renderItem(action, 'destructive'))}
    </>
  )
}

/** "⋯" button with the F5.1 chat menu. */
export function ChatActionsDropdown({
  chat,
  onAction,
  className,
}: {
  chat: Chat
  onAction: (chat: Chat, action: ChatAction) => void
  className?: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className={className}
          aria-label={m.chat_actions_menu({ title: chat.title })}
          title={m.chat_actions_menu({ title: chat.title })}
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <ChatActionItems
          chat={chat}
          onAction={onAction}
          Item={DropdownMenuItem}
          Separator={DropdownMenuSeparator}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Same menu on right-click anywhere in `children` (a matrix row). */
export function ChatActionsContextMenu({
  chat,
  onAction,
  children,
}: {
  chat: Chat
  onAction: (chat: Chat, action: ChatAction) => void
  children: React.ReactNode
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ChatActionItems
          chat={chat}
          onAction={onAction}
          Item={ContextMenuItem}
          Separator={ContextMenuSeparator}
        />
      </ContextMenuContent>
    </ContextMenu>
  )
}
