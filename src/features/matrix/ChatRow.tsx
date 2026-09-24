import { memo } from 'react'
import { BellOff, Loader2, Pin } from 'lucide-react'
import { cn } from 'cn'
import type { Column } from '@tanstack/react-table'
import type { Chat, ChatFolderRelation, Folder } from '#/telegram/types'
import { useChatPhoto } from '#/queries/dialogs'
import { m } from '#/paraglide/messages'
import { gridTemplateColumns } from '#/features/matrix/layout'
import {
  wouldEmptyFolder,
  wouldEmptyFolderTo,
} from '#/features/matrix/relation-cycle'
import { chatDisplayTitle } from '#/features/matrix/filters'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { FlagCell } from '#/features/matrix/FlagCell'
import { MatrixCell } from '#/features/matrix/MatrixCell'
import { ChatActionsDropdown } from '#/features/chat-actions/ChatActionsMenu'
import {
  CHAT_ID_ATTR,
  FOLDER_ID_ATTR,
} from '#/features/matrix/MatrixContextMenu'
import type { ChatAction } from '#/features/chat-actions/chat-actions'

/**
 * One chat row of the matrix. Memoized, and every prop is either data or a
 * callback that stays the same across scroll frames — virtualization
 * re-renders the list on every frame, and without this all ~50 visible rows
 * × 20 cells re-rendered with it (ТЗ §6: 2000 × 20 at ≥ 50 fps).
 */
export const ChatRow = memo(function ChatRow({
  chat,
  rowIndex,
  columns,
  onOpenChat,
  onSetArchived,
  onCycleRelation,
  onSetRelation,
  onTogglePinned,
  onChatAction,
  selected,
  onToggleSelect,
  listIndex,
  onSelectDragStart,
  consumeSelectClick,
  isBlocked = false,
  isBusy = false,
  archivePending = false,
  pinnedPending = false,
  pendingFolderIds = '',
  top,
  height,
}: {
  chat: Chat
  /** This row's index in the matrix keyboard grid (see `useGridKeyboard`). */
  rowIndex: number
  /** Visible leaf columns, in the table's own order (F2.1). */
  columns: Column<Chat, unknown>[]
  onOpenChat?: (chat: Chat) => void
  onSetArchived?: (chat: Chat, archived: boolean) => void
  onCycleRelation?: (
    chat: Chat,
    folder: Folder,
    current: ChatFolderRelation | undefined,
  ) => void
  /** Direct jump to a state, bypassing the cycle (Shift+click, cell menu). */
  onSetRelation?: (
    chat: Chat,
    folder: Folder,
    current: ChatFolderRelation | undefined,
    next: ChatFolderRelation | null,
  ) => void
  onTogglePinned?: (chat: Chat, pinned: boolean) => void
  onChatAction?: (chat: Chat, action: ChatAction) => void
  /** Row selection for bulk actions (F6.1); `shift` extends a range. */
  selected?: boolean
  onToggleSelect?: (chat: Chat, shift: boolean) => void
  /** Position in the current list, for drag-selecting across rows. */
  listIndex?: number
  onSelectDragStart?: (listIndex: number, event: React.PointerEvent) => void
  /** True when the checkbox click only ends a drag and mustn't toggle. */
  consumeSelectClick?: () => boolean
  isBlocked?: boolean
  /** A destructive action on this chat is in flight (F5). */
  isBusy?: boolean
  // Plain values, not predicates: a predicate is a new function whenever
  // the parent renders, which would defeat the memo on every row.
  archivePending?: boolean
  pinnedPending?: boolean
  /** Comma-separated ids of folders with a write in flight for this chat. */
  pendingFolderIds?: string
  /** Position within the virtualized list, in px. */
  top: number
  height: number
}) {
  const photo = useChatPhoto({ id: chat.id, kind: chat.kind })
  const displayTitle = chatDisplayTitle(chat)
  const pendingFolders = new Set(
    pendingFolderIds ? pendingFolderIds.split(',').map(Number) : [],
  )

  return (
    <div
      role="row"
      {...{ [CHAT_ID_ATTR]: chat.id }}
      data-row-index={listIndex}
      aria-busy={isBusy || undefined}
      className={cn(
        'group grid items-center border-b border-border last:border-b-0 hover:bg-accent/40',
        isBusy && 'pointer-events-none opacity-50',
        selected && 'bg-accent/70 hover:bg-accent/70',
      )}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height,
        transform: `translateY(${top}px)`,
        gridTemplateColumns: gridTemplateColumns(
          columns.map((c) => c.getSize()),
        ),
      }}
    >
      {columns.map((column, colIndex) => {
        const meta = column.columnDef.meta?.matrix
        if (!meta) return null
        const cell = { row: rowIndex, col: colIndex }

        if (meta.kind === 'chat') {
          return (
            <div
              key={column.id}
              role="rowheader"
              // Opaque mixes, not `bg-accent/NN`: this cell is sticky, and a
              // translucent background would show the columns scrolling
              // under it.
              className={cn(
                'sticky left-0 z-10 flex min-w-0 items-center gap-2 px-3',
                selected
                  ? 'bg-[color-mix(in_oklab,var(--color-accent)_70%,var(--color-background))]'
                  : 'bg-background group-hover:bg-[color-mix(in_oklab,var(--color-accent)_40%,var(--color-background))]',
              )}
            >
              {onToggleSelect && (
                <Checkbox
                  // Out of the Tab order like the rest of the row's extras:
                  // Space on the chat cell selects (see MatrixView).
                  tabIndex={-1}
                  checked={selected ?? false}
                  aria-label={m.bulk_select_chat({ title: displayTitle })}
                  // onClick, not onCheckedChange: only the click carries the
                  // Shift modifier needed for range selection.
                  onPointerDown={
                    onSelectDragStart && listIndex !== undefined
                      ? (event) => onSelectDragStart(listIndex, event)
                      : undefined
                  }
                  onClick={(event) => {
                    event.preventDefault()
                    if (consumeSelectClick?.()) return
                    onToggleSelect(chat, event.shiftKey)
                  }}
                />
              )}
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
                data-cell-row={cell.row}
                data-cell-col={cell.col}
                className="min-w-0 truncate rounded-sm text-left text-sm focus-visible:outline-2 focus-visible:outline-ring enabled:hover:underline"
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
                  // Pin/unpin is also in the row's menu, which the keyboard
                  // reaches via the context-menu key.
                  tabIndex={-1}
                  disabled={pinnedPending}
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
                  {pinnedPending ? (
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
                  tabIndex={-1}
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
            <div
              key={column.id}
              role="gridcell"
              className="flex justify-center"
            >
              <FlagCell
                cell={cell}
                active={chat.isArchived}
                label={
                  chat.isArchived
                    ? m.matrix_cell_archived()
                    : m.matrix_cell_not_archived()
                }
                pending={archivePending}
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
          return <div key={column.id} role="gridcell" />
        }

        const folder = meta.folder
        const current = chat.folders[folder.id]
        const pending = pendingFolders.has(folder.id)
        const disabled = folder.readOnly || wouldEmptyFolder(folder, current)

        return (
          <div
            key={column.id}
            role="gridcell"
            {...{ [FOLDER_ID_ATTR]: folder.id }}
            className={cn(
              'flex justify-center',
              folder.readOnly && 'opacity-60',
            )}
          >
            <MatrixCell
              cell={cell}
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
              onSelectState={
                onSetRelation && !folder.readOnly
                  ? (next) => onSetRelation(chat, folder, current, next)
                  : undefined
              }
              canSelectState={(next) =>
                !wouldEmptyFolderTo(folder, current, next)
              }
            />
          </div>
        )
      })}
    </div>
  )
})
