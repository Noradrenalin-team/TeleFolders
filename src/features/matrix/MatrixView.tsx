import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { RefreshCw } from 'lucide-react'
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
import { MatrixHeader } from '#/features/matrix/MatrixHeader'
import { FlagRow } from '#/features/matrix/FlagRow'
import { ChatRow } from '#/features/matrix/ChatRow'
import { MatrixSkeleton } from '#/features/matrix/MatrixSkeleton'

export function MatrixView({
  folders,
  chats,
  isLoading,
  loadedCount,
  isRefreshing = false,
  onRefresh,
  onAddFolder,
  onSetArchived,
  onCycleRelation,
  onToggleFlag,
  onSelectFolder,
  onTogglePinned,
  isArchivePending,
  isRelationPending,
  isFlagPending,
  toolbar,
}: {
  folders: Folder[]
  chats: Chat[]
  isLoading: boolean
  loadedCount: number
  isRefreshing?: boolean
  onRefresh?: () => void
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
  isArchivePending?: (chatId: number) => boolean
  isRelationPending?: (chatId: number, folderId: number) => boolean
  isFlagPending?: (folderId: number, flag: FolderFlag) => boolean
  toolbar?: React.ReactNode
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: chats.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  })

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-sm text-muted-foreground">
          {isLoading
            ? m.matrix_loading_progress({ count: loadedCount })
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

      {isLoading ? (
        <MatrixSkeleton loadedCount={loadedCount} />
      ) : chats.length === 0 ? (
        <EmptyState message={m.matrix_empty_no_chats()} />
      ) : (
        <div ref={scrollRef} role="grid" className="flex-1 overflow-auto">
          <div className="sticky top-0 z-20">
            <MatrixHeader
              folders={folders}
              onAddFolder={onAddFolder}
              onSelectFolder={onSelectFolder}
            />
            {FOLDER_FLAGS.map(({ flag, label }) => (
              <FlagRow
                key={flag}
                flag={flag}
                label={label()}
                folders={folders}
                onToggle={onToggleFlag}
                isPending={isFlagPending}
              />
            ))}
          </div>
          <div
            style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const chat = chats[virtualRow.index]
              return (
                <ChatRow
                  key={chat.id}
                  chat={chat}
                  folders={folders}
                  onSetArchived={onSetArchived}
                  onCycleRelation={onCycleRelation}
                  onTogglePinned={onTogglePinned}
                  isArchivePending={isArchivePending}
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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}
