import { useMemo, useRef } from 'react'
import { useReactTable, getCoreRowModel } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '#/components/ui/button'
import type {
  Chat,
  ChatFolderRelation,
  Folder,
  FolderFlag,
} from '#/telegram/types'
import { m } from '#/paraglide/messages'
import { ROW_HEIGHT } from '#/features/matrix/layout'
import { FOLDER_FLAGS } from '#/features/matrix/flags'
import { buildMatrixColumns, CHAT_COLUMN_ID } from '#/features/matrix/columns'
import { MatrixHeader } from '#/features/matrix/MatrixHeader'
import { FlagRow } from '#/features/matrix/FlagRow'
import { ChatRow } from '#/features/matrix/ChatRow'
import type { ChatAction } from '#/features/chat-actions/chat-actions'
import { MatrixSkeleton } from '#/features/matrix/MatrixSkeleton'

export function MatrixView({
  folders,
  chats,
  totalCount,
  isLoading,
  isError = false,
  loadedCount,
  isRefreshing = false,
  hasActiveFilters = false,
  onRefresh,
  onRetry,
  onResetFilters,
  onAddFolder,
  onSetArchived,
  onCycleRelation,
  onToggleFlag,
  onSelectFolder,
  onTogglePinned,
  onOpenChat,
  onReorderFolders,
  onChatAction,
  isChatBlocked,
  isChatBusy,
  isArchivePending,
  isPinnedPending,
  isRelationPending,
  isFlagPending,
  toolbar,
}: {
  folders: Folder[]
  chats: Chat[]
  /** Total chats before search/type/state filters — for "Показано N из M"
   * (distinct from `chats.length`, which already reflects the filters). */
  totalCount?: number
  isLoading: boolean
  isError?: boolean
  loadedCount: number
  isRefreshing?: boolean
  /** Whether any search/filter is currently narrowing `chats` — decides
   * between "no chats at all" and "nothing matches" empty states (F2.11). */
  hasActiveFilters?: boolean
  onRefresh?: () => void
  onRetry?: () => void
  onResetFilters?: () => void
  onAddFolder?: () => void
  onSetArchived?: (chat: Chat, archived: boolean) => void
  onCycleRelation?: (
    chat: Chat,
    folder: Folder,
    current: ChatFolderRelation | undefined,
  ) => void
  onToggleFlag?: (folder: Folder, flag: FolderFlag, next: boolean) => void
  onSelectFolder?: (folder: Folder) => void
  onTogglePinned?: (chat: Chat, pinned: boolean) => void
  onOpenChat?: (chat: Chat) => void
  onReorderFolders?: (folderIds: number[]) => void
  onChatAction?: (chat: Chat, action: ChatAction) => void
  isChatBlocked?: (chatId: number) => boolean
  isChatBusy?: (chatId: number) => boolean
  isArchivePending?: (chatId: number) => boolean
  isPinnedPending?: (chatId: number) => boolean
  isRelationPending?: (chatId: number, folderId: number) => boolean
  isFlagPending?: (folderId: number, flag: FolderFlag) => boolean
  toolbar?: React.ReactNode
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const columns = useMemo(() => buildMatrixColumns(folders), [folders])

  // Column identity/order/width lives on the table (F2.1) — everything else
  // (filtering, sorting) stays outside it, done up front by
  // `filterAndSortChats` before `chats` ever gets here.
  const table = useReactTable({
    data: chats,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (chat) => String(chat.id),
    initialState: { columnPinning: { left: [CHAT_COLUMN_ID] } },
  })

  const visibleColumns = table.getVisibleLeafColumns()
  const rows = table.getRowModel().rows
  // The row's own width has to match the table's *total* column width, not
  // 100% of the scroll container's viewport — otherwise the sticky first
  // column only has room to "stick" within one screen-width of horizontal
  // scroll and detaches past that (ТЗ §5).
  const totalWidth = table.getTotalSize()

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  })

  const showNoResults = !isLoading && !isError && chats.length === 0
  const showNoFoldersHint = !isLoading && !isError && folders.length === 0

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-sm text-muted-foreground">
          {isLoading
            ? m.matrix_loading_progress({ count: loadedCount })
            : totalCount !== undefined && totalCount !== chats.length
              ? m.matrix_shown_count({ shown: chats.length, total: totalCount })
              : m.matrix_loading_progress({ count: chats.length })}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isRefreshing}
          onClick={onRefresh}
        >
          <RefreshCw
            className={isRefreshing ? 'animate-spin' : undefined}
            aria-hidden="true"
          />
          {m.matrix_refresh()}
        </Button>
      </div>

      {toolbar}

      {showNoFoldersHint && (
        <p className="border-b border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
          {m.matrix_no_folders_hint()}
        </p>
      )}

      {isLoading ? (
        <MatrixSkeleton loadedCount={loadedCount} />
      ) : isError ? (
        <ErrorState onRetry={onRetry} />
      ) : showNoResults ? (
        <EmptyState
          message={
            hasActiveFilters
              ? m.matrix_empty_no_results()
              : m.matrix_empty_no_chats()
          }
          action={
            hasActiveFilters && onResetFilters ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onResetFilters}
              >
                {m.matrix_reset_filters()}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div
          ref={scrollRef}
          role="grid"
          aria-rowcount={rows.length + 1 + FOLDER_FLAGS.length}
          aria-colcount={visibleColumns.length}
          className="flex-1 overflow-auto"
        >
          <div
            className="sticky top-0 z-20"
            style={{ width: totalWidth, minWidth: '100%' }}
          >
            <MatrixHeader
              columns={visibleColumns}
              onAddFolder={onAddFolder}
              onSelectFolder={onSelectFolder}
              onReorderFolders={onReorderFolders}
            />
            {/* Flag rows toggle a category (contacts, groups, …) *within a
                folder column* — with no folder columns there's nothing for
                them to act on, so they'd just be a list of unclickable
                labels (F2.2 only makes sense once F4.1 has created a
                folder). */}
            {folders.length > 0 &&
              FOLDER_FLAGS.map(({ flag, label }) => (
                <FlagRow
                  key={flag}
                  flag={flag}
                  label={label()}
                  columns={visibleColumns}
                  onToggle={onToggleFlag}
                  isPending={isFlagPending}
                />
              ))}
          </div>
          <div
            style={{
              height: virtualizer.getTotalSize(),
              width: totalWidth,
              minWidth: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const chat = rows[virtualRow.index].original
              return (
                <ChatRow
                  key={chat.id}
                  chat={chat}
                  columns={visibleColumns}
                  onOpenChat={onOpenChat}
                  onSetArchived={onSetArchived}
                  onCycleRelation={onCycleRelation}
                  onTogglePinned={onTogglePinned}
                  onChatAction={onChatAction}
                  isBlocked={isChatBlocked?.(chat.id)}
                  isBusy={isChatBusy?.(chat.id)}
                  isArchivePending={isArchivePending}
                  isPinnedPending={isPinnedPending}
                  isRelationPending={isRelationPending}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: virtualRow.size,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyState({
  message,
  action,
}: {
  message: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
      <span>{message}</span>
      {action}
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center text-sm text-muted-foreground">
      <AlertCircle className="size-8 text-destructive" aria-hidden="true" />
      <span>{m.matrix_load_error()}</span>
      {onRetry && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          {m.matrix_retry()}
        </Button>
      )}
    </div>
  )
}
