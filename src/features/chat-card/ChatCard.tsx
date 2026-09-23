import { BellOff, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from 'cn'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'
import { FlagCell } from '#/features/matrix/FlagCell'
import { MatrixCell } from '#/features/matrix/MatrixCell'
import { wouldEmptyFolder } from '#/features/matrix/relation-cycle'
import { chatDisplayTitle } from '#/features/matrix/filters'
import { useChatPhoto } from '#/queries/dialogs'
import { ChatActionsDropdown } from '#/features/chat-actions/ChatActionsMenu'
import type { ChatAction } from '#/features/chat-actions/chat-actions'
import type {
  Chat,
  ChatFolderRelation,
  Folder,
  PeerKind,
} from '#/telegram/types'
import { m } from '#/paraglide/messages'

const TYPE_LABEL: Record<PeerKind, () => string> = {
  user: () => m.chat_card_type_user(),
  bot: () => m.chat_card_type_bot(),
  group: () => m.chat_card_type_group(),
  supergroup: () => m.chat_card_type_supergroup(),
  channel: () => m.chat_card_type_channel(),
  saved: () => m.chat_card_type_saved(),
}

/** Chat details modal with folder toggles and prev/next navigation (F7). A
 * pure presentational component: `routes/matrix.tsx` supplies the chat, the
 * (already filtered/sorted) neighbor availability, and the same mutations
 * the matrix cells use, so behavior stays identical in both places. */
export function ChatCard({
  chat,
  folders,
  open,
  onOpenChange,
  onPrev,
  onNext,
  canGoPrev = false,
  canGoNext = false,
  onSetArchived,
  onTogglePinned,
  onCycleRelation,
  onChatAction,
  isBlocked = false,
  isRelationPending,
}: {
  chat: Chat | undefined
  folders: Folder[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onPrev?: () => void
  onNext?: () => void
  canGoPrev?: boolean
  canGoNext?: boolean
  onSetArchived?: (chat: Chat, archived: boolean) => void
  onTogglePinned?: (chat: Chat, pinned: boolean) => void
  onCycleRelation?: (
    chat: Chat,
    folder: Folder,
    current: ChatFolderRelation | undefined,
  ) => void
  onChatAction?: (chat: Chat, action: ChatAction) => void
  isBlocked?: boolean
  isRelationPending?: (chatId: number, folderId: number) => boolean
}) {
  const photo = useChatPhoto(
    chat ? { id: chat.id, kind: chat.kind } : { id: 0, kind: 'user' },
    chat !== undefined,
  )

  if (!chat) return null

  const title = chatDisplayTitle(chat)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft' && canGoPrev) onPrev?.()
          else if (event.key === 'ArrowRight' && canGoNext) onNext?.()
        }}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-base font-medium text-muted-foreground">
              {photo.data ? (
                <img
                  src={photo.data}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                title.charAt(0).toUpperCase()
              )}
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate">{title}</DialogTitle>
              <DialogDescription className="flex items-center gap-1.5 truncate">
                {chat.username && <span>@{chat.username}</span>}
                <span>{TYPE_LABEL[chat.kind]()}</span>
                {chat.isMuted && (
                  <BellOff className="size-3 shrink-0" aria-hidden="true" />
                )}
                {chat.unreadCount > 0 && (
                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] leading-none font-medium text-primary-foreground">
                    {m.matrix_unread_count({ count: chat.unreadCount })}
                  </span>
                )}
              </DialogDescription>
            </div>
            {onChatAction && (
              <ChatActionsDropdown
                chat={chat}
                isBlocked={isBlocked}
                onAction={onChatAction}
                className="mr-6 shrink-0"
              />
            )}
          </div>
        </DialogHeader>

        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <FlagCell
              active={chat.isArchived}
              label={m.chat_card_archive_label()}
              onClick={
                onSetArchived
                  ? () => onSetArchived(chat, !chat.isArchived)
                  : undefined
              }
            />
            {m.chat_card_archive_label()}
          </label>
          <label className="flex items-center gap-2">
            <FlagCell
              active={chat.isPinned}
              label={m.chat_card_pin_label()}
              onClick={
                onTogglePinned
                  ? () => onTogglePinned(chat, !chat.isPinned)
                  : undefined
              }
            />
            {m.chat_card_pin_label()}
          </label>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">
            {m.chat_card_folders_heading()}
          </h3>
          {folders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {m.chat_card_no_folders()}
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
              {folders.map((folder) => {
                const current = chat.folders[folder.id]
                const disabled =
                  folder.readOnly || wouldEmptyFolder(folder, current)
                return (
                  <li
                    key={folder.id}
                    className={cn(
                      'flex items-center justify-between gap-2 px-3 py-1.5 text-sm',
                      folder.readOnly && 'opacity-60',
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-1.5 truncate">
                      {folder.emoticon && (
                        <span aria-hidden="true">{folder.emoticon}</span>
                      )}
                      <span className="truncate">{folder.title}</span>
                    </span>
                    <MatrixCell
                      state={current ?? 'none'}
                      disabled={disabled}
                      disabledReason={
                        folder.readOnly ? undefined : m.error_folder_empty()
                      }
                      pending={isRelationPending?.(chat.id, folder.id) ?? false}
                      onClick={
                        onCycleRelation
                          ? () => onCycleRelation(chat, folder, current)
                          : undefined
                      }
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canGoPrev}
            onClick={onPrev}
          >
            <ChevronLeft aria-hidden="true" />
            {m.chat_card_prev()}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canGoNext}
            onClick={onNext}
          >
            {m.chat_card_next()}
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
