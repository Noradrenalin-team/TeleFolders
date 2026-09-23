import { BellOff, Loader2, Pin } from 'lucide-react'
import { cn } from 'cn'
import type { Column } from '@tanstack/react-table'
import type { Chat, ChatFolderRelation, Folder } from '#/telegram/types'
import { useChatPhoto } from '#/queries/dialogs'
import { m } from '#/paraglide/messages'
import { gridTemplateColumns } from '#/features/matrix/layout'
import { wouldEmptyFolder } from '#/features/matrix/relation-cycle'
import { chatDisplayTitle } from '#/features/matrix/filters'
import { Button } from '#/components/ui/button'
import { FlagCell } from '#/features/matrix/FlagCell'
import { MatrixCell } from '#/features/matrix/MatrixCell'
import {
  ChatActionsContextMenu,
  ChatActionsDropdown,
} from '#/features/chat-actions/ChatActionsMenu'
import type { ChatAction } from '#/features/chat-actions/chat-actions'

export function ChatRow({
  chat,
  columns,
  onOpenChat,
  onSetArchived,
  onCycleRelation,
  onTogglePinned,
  onChatAction,
  isBlocked = false,
  isBusy = false,
  isArchivePending,
  isPinnedPending,
  isRelationPending,
  style,
}: {
  chat: Chat
  /** Visible leaf columns, in the table's own order (F2.1). */
  columns: Column<Chat, unknown>[]
  onOpenChat?: (chat: Chat) => void
  onSetArchived?: (chat: Chat, archived: boolean) => void
  onCycleRelation?: (
    chat: Chat,
    folder: Folder,
    current: ChatFolderRelation | undefined,
  ) => void
  onTogglePinned?: (chat: Chat, pinned: boolean) => void
  onChatAction?: (chat: Chat, action: ChatAction) => void
  isBlocked?: boolean
  /** A destructive action on this chat is in flight (F5). */
  isBusy?: boolean
  isArchivePending?: (chatId: number) => boolean
  isPinnedPending?: (chatId: number) => boolean
  isRelationPending?: (chatId: number, folderId: number) => boolean
  style?: React.CSSProperties
}) {
  const photo = useChatPhoto({ id: chat.id, kind: chat.kind })
  const displayTitle = chatDisplayTitle(chat)

  const row = (
    <div
      role="row"
      aria-busy={isBusy || undefined}
      className={cn(
        'group grid items-center border-b border-border last:border-b-0 hover:bg-accent/40',
        isBusy && 'pointer-events-none opacity-50',
      )}
      style={{
        ...style,
        gridTemplateColumns: gridTemplateColumns(
          columns.map((c) => c.getSize()),
        ),
      }}
    >
      {columns.map((column) => {
        const meta = column.columnDef.meta?.matrix
        if (!meta) return null

        if (meta.kind === 'chat') {
          return (
            <div
              key={column.id}
              role="rowheader"
              className="sticky left-0 z-10 flex min-w-0 items-center gap-2 bg-background px-3 group-hover:bg-accent/40"
            >
              <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-medium text-muted-foreground">
                {photo.data ? (
                  <img
                    src={photo.data}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  displayTitle.charAt(0).toUpperCase()
                )}
              </span>
              <button
                type="button"
                className="min-w-0 truncate text-left text-sm enabled:hover:underline"
                disabled={!onOpenChat}
                onClick={onOpenChat ? () => onOpenChat(chat) : undefined}
              >
                {displayTitle}
              </button>
              {onTogglePinned && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={isPinnedPending?.(chat.id) ?? false}
                  className={cn(
                    'shrink-0',
                    !chat.isPinned &&
                      'text-muted-foreground opacity-0 focus-visible:opacity-100 group-hover:opacity-100',
                  )}
                  aria-label={
                    chat.isPinned
                      ? m.matrix_chat_pinned()
                      : m.matrix_chat_not_pinned()
                  }
                  aria-pressed={chat.isPinned}
                  title={
                    chat.isPinned
                      ? m.matrix_chat_pinned()
                      : m.matrix_chat_not_pinned()
                  }
                  onClick={() => onTogglePinned(chat, !chat.isPinned)}
                >
                  {isPinnedPending?.(chat.id) ? (
                    <Loader2
                      className="size-3 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Pin
                      className={cn(
                        'size-3',
                        chat.isPinned && 'fill-current text-primary',
                      )}
                      aria-hidden="true"
                    />
                  )}
                </Button>
              )}
              {chat.isMuted && (
                <BellOff
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
              {onChatAction && (
                <ChatActionsDropdown
                  chat={chat}
                  isBlocked={isBlocked}
                  onAction={onChatAction}
                  className="shrink-0 text-muted-foreground opacity-0 focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
                />
              )}
              {chat.unreadCount > 0 && (
                <span
                  className="ml-auto shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium leading-none text-primary-foreground"
                  aria-label={m.matrix_unread_count({
                    count: chat.unreadCount,
                  })}
                >
                  {chat.unreadCount}
                </span>
              )}
            </div>
          )
        }

        if (meta.kind === 'archive') {
          return (
            <div key={column.id} className="flex justify-center">
              <FlagCell
                active={chat.isArchived}
                label={
                  chat.isArchived
                    ? m.matrix_cell_archived()
                    : m.matrix_cell_not_archived()
                }
                pending={isArchivePending?.(chat.id) ?? false}
                onClick={
                  onSetArchived
                    ? () => onSetArchived(chat, !chat.isArchived)
                    : undefined
                }
              />
            </div>
          )
        }

        if (meta.kind !== 'folder') {
          return <div key={column.id} />
        }

        const folder = meta.folder
        const current = chat.folders[folder.id]
        const pending = isRelationPending?.(chat.id, folder.id) ?? false
        const disabled = folder.readOnly || wouldEmptyFolder(folder, current)

        return (
          <div
            key={column.id}
            className={cn(
              'flex justify-center',
              folder.readOnly && 'opacity-60',
            )}
          >
            <MatrixCell
              state={current ?? 'none'}
              disabled={disabled}
              disabledReason={
                folder.readOnly ? undefined : m.error_folder_empty()
              }
              pending={pending}
              onClick={
                onCycleRelation
                  ? () => onCycleRelation(chat, folder, current)
                  : undefined
              }
            />
          </div>
        )
      })}
    </div>
  )

  return onChatAction ? (
    <ChatActionsContextMenu
      chat={chat}
      isBlocked={isBlocked}
      onAction={onChatAction}
    >
      {row}
    </ChatActionsContextMenu>
  ) : (
    row
  )
}
