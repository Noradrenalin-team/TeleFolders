import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Archive, BellOff, Pin } from 'lucide-react'
import { cn } from 'cn'
import { Checkbox } from '#/components/ui/checkbox'
import { ChatActionsDropdown } from '#/features/chat-actions/ChatActionsMenu'
import type { ChatAction } from '#/features/chat-actions/chat-actions'
import { chatDisplayTitle } from '#/features/matrix/filters'
import { useChatPhoto } from '#/queries/dialogs'
import type { Chat, Folder } from '#/telegram/types'
import { m } from '#/paraglide/messages'

const ITEM_HEIGHT = 64

function ChatListItem({
  chat,
  folderNames,
  selected,
  onToggleSelect,
  onOpenChat,
  onChatAction,
  isBlocked,
  style,
}: {
  chat: Chat
  folderNames: string[]
  selected?: boolean
  onToggleSelect?: (chat: Chat, shift: boolean) => void
  onOpenChat?: (chat: Chat) => void
  onChatAction?: (chat: Chat, action: ChatAction) => void
  isBlocked?: boolean
  style: React.CSSProperties
}) {
  const photo = useChatPhoto({ id: chat.id, kind: chat.kind })
  const title = chatDisplayTitle(chat)

  return (
    <li
      style={style}
      className={cn(
        'flex items-center gap-3 border-b border-border px-3',
        selected && 'bg-accent/70',
      )}
    >
      {onToggleSelect && (
        <Checkbox
          checked={selected ?? false}
          aria-label={m.bulk_select_chat({ title })}
          onClick={(event) => {
            event.preventDefault()
            onToggleSelect(chat, event.shiftKey)
          }}
        />
      )}
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 py-2 text-left"
        disabled={!onOpenChat}
        onClick={onOpenChat ? () => onOpenChat(chat) : undefined}
      >
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-medium text-muted-foreground">
          {photo.data ? (
            <img src={photo.data} alt="" className="size-full object-cover" />
          ) : (
            title.charAt(0).toUpperCase()
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-medium">{title}</span>
            {chat.isPinned && (
              <Pin
                className="size-3 shrink-0 fill-current text-primary"
                aria-label={m.matrix_chat_pinned()}
              />
            )}
            {chat.isMuted && (
              <BellOff
                className="size-3 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            )}
            {chat.isArchived && (
              <Archive
                className="size-3 shrink-0 text-muted-foreground"
                aria-label={m.matrix_cell_archived()}
              />
            )}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {folderNames.length > 0
              ? folderNames.join(', ')
              : m.chat_list_no_folders()}
          </span>
        </span>
        {chat.unreadCount > 0 && (
          <span
            className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] leading-none font-medium text-primary-foreground"
            aria-label={m.matrix_unread_count({ count: chat.unreadCount })}
          >
            {chat.unreadCount}
          </span>
        )}
      </button>
      {onChatAction && (
        <ChatActionsDropdown
          chat={chat}
          isBlocked={isBlocked}
          onAction={onChatAction}
          className="shrink-0 text-muted-foreground"
        />
      )}
    </li>
  )
}

/**
 * The matrix on a phone (ТЗ §5, plan 7.3): a 20-column grid doesn't fit, so
 * it's a list of chats instead — each shows which folders it's in, and
 * tapping it opens the chat card, where the folder toggles and actions are.
 */
export function ChatList({
  chats,
  folders,
  onOpenChat,
  onChatAction,
  selection,
  isChatBlocked,
}: {
  chats: Chat[]
  folders: Folder[]
  onOpenChat?: (chat: Chat) => void
  onChatAction?: (chat: Chat, action: ChatAction) => void
  selection?: {
    isSelected: (chatId: number) => boolean
    onToggle: (chat: Chat, shift: boolean) => void
  }
  isChatBlocked?: (chatId: number) => boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: chats.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 8,
  })
  const folderTitle = new Map(folders.map((f) => [f.id, f.title]))

  return (
    <div ref={scrollRef} className="flex-1 overflow-auto">
      <ul
        aria-label={m.chat_list_label()}
        className="relative"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const chat = chats[item.index]
          const folderNames = Object.entries(chat.folders)
            .filter(([, relation]) => relation !== 'exclude')
            .map(([id]) => folderTitle.get(Number(id)))
            .filter((title) => title !== undefined)
          return (
            <ChatListItem
              key={chat.id}
              chat={chat}
              folderNames={folderNames}
              selected={selection?.isSelected(chat.id)}
              onToggleSelect={selection?.onToggle}
              onOpenChat={onOpenChat}
              onChatAction={onChatAction}
              isBlocked={isChatBlocked?.(chat.id)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: item.size,
                transform: `translateY(${item.start}px)`,
              }}
            />
          )
        })}
      </ul>
    </div>
  )
}
