import { BellOff, Pin } from 'lucide-react'
import { cn } from 'cn'
import type { Chat, ChatFolderRelation, Folder } from '#/telegram/types'
import { useChatPhoto } from '#/queries/dialogs'
import { m } from '#/paraglide/messages'
import { gridTemplateColumns } from '#/features/matrix/layout'
import { wouldEmptyFolder } from '#/features/matrix/relation-cycle'
import { Button } from '#/components/ui/button'
import { FlagCell } from '#/features/matrix/FlagCell'
import { MatrixCell } from '#/features/matrix/MatrixCell'

export function ChatRow({
  chat,
  folders,
  onSetArchived,
  onCycleRelation,
  onTogglePinned,
  isArchivePending,
  isRelationPending,
  style,
}: {
  chat: Chat
  folders: Folder[]
  onSetArchived?: (chat: Chat, archived: boolean) => void
  onCycleRelation?: (
    chat: Chat,
    folder: Folder,
    current: ChatFolderRelation | undefined,
  ) => void
  onTogglePinned?: (chat: Chat, pinned: boolean) => void
  isArchivePending?: (chatId: number) => boolean
  isRelationPending?: (chatId: number, folderId: number) => boolean
  style?: React.CSSProperties
}) {
  const photo = useChatPhoto({ id: chat.id, kind: chat.kind })
  const displayTitle = chat.isSelf ? m.matrix_self_label() : chat.title

  return (
    <div
      role="row"
      className="group grid items-center border-b border-border last:border-b-0 hover:bg-accent/40"
      style={{
        ...style,
        gridTemplateColumns: gridTemplateColumns(folders.length),
      }}
    >
      <div
        role="rowheader"
        className="sticky left-0 z-10 flex min-w-0 items-center gap-2 bg-background px-3"
      >
        <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-medium text-muted-foreground">
          {photo.data ? (
            <img src={photo.data} alt="" className="size-full object-cover" />
          ) : (
            displayTitle.charAt(0).toUpperCase()
          )}
        </span>
        <span className="truncate text-sm">{displayTitle}</span>
        {onTogglePinned && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className={cn(
              'shrink-0',
              !chat.isPinned &&
                'text-muted-foreground opacity-0 group-hover:opacity-100',
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
            <Pin
              className={cn(
                'size-3',
                chat.isPinned && 'fill-current text-primary',
              )}
              aria-hidden="true"
            />
          </Button>
        )}
        {chat.isMuted && (
          <BellOff
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        )}
        {chat.unreadCount > 0 && (
          <span
            className="ml-auto shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium leading-none text-primary-foreground"
            aria-label={m.matrix_unread_count({ count: chat.unreadCount })}
          >
            {chat.unreadCount}
          </span>
        )}
      </div>

      <div className="flex justify-center">
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

      {folders.map((folder) => {
        const current = chat.folders[folder.id]
        const pending = isRelationPending?.(chat.id, folder.id) ?? false
        const disabled = folder.readOnly || wouldEmptyFolder(folder, current)
        return (
          <div
            key={folder.id}
            className={cn(
              'flex justify-center',
              folder.readOnly && 'opacity-60',
            )}
          >
            <MatrixCell
              state={current ?? 'none'}
              disabled={disabled}
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

      <div />
    </div>
  )
}
