import { useState } from 'react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '#/components/ui/context-menu'
import { ChatActionItems } from '#/features/chat-actions/ChatActionsMenu'
import type { ChatAction } from '#/features/chat-actions/chat-actions'
import { CellStateMenuItems } from '#/features/matrix/MatrixCell'
import { wouldEmptyFolderTo } from '#/features/matrix/relation-cycle'
import type { Chat, ChatFolderRelation, Folder } from '#/telegram/types'

type Target = { chat: Chat; folder?: Folder }

/** Row/cell attributes the menu reads its target from. */
export const CHAT_ID_ATTR = 'data-chat-id'
export const FOLDER_ID_ATTR = 'data-folder-id'

/**
 * One context menu for the whole grid instead of one per row and one per
 * cell: with 2000 × 20 that was ~1,100 Radix menu roots mounted on screen,
 * rebuilt on every scroll frame. On open it looks at what was right-clicked
 * (or long-pressed, or had the context-menu key pressed on it): a folder
 * cell gets the four-state menu (ТЗ §5), anything else in a row gets the
 * chat's F5.1 actions.
 */
export function MatrixContextMenu({
  chatsById,
  foldersById,
  onChatAction,
  onSetRelation,
  isChatBlocked,
  children,
}: {
  chatsById: ReadonlyMap<number, Chat>
  foldersById: ReadonlyMap<number, Folder>
  onChatAction?: (chat: Chat, action: ChatAction) => void
  onSetRelation?: (
    chat: Chat,
    folder: Folder,
    current: ChatFolderRelation | undefined,
    next: ChatFolderRelation | null,
  ) => void
  isChatBlocked?: (chatId: number) => boolean
  children: React.ReactElement
}) {
  const [target, setTarget] = useState<Target | null>(null)

  function resolve(element: EventTarget): Target | null {
    if (!(element instanceof Element)) return null
    const row = element.closest(`[${CHAT_ID_ATTR}]`)
    const chat = row && chatsById.get(Number(row.getAttribute(CHAT_ID_ATTR)))
    if (!chat) return null
    const cell = element.closest(`[${FOLDER_ID_ATTR}]`)
    const folder =
      cell && foldersById.get(Number(cell.getAttribute(FOLDER_ID_ATTR)))
    const cellMenu = folder && !folder.readOnly && onSetRelation
    return { chat, folder: cellMenu ? folder : undefined }
  }

  const showsSomething = (next: Target | null) =>
    next !== null && (next.folder !== undefined || onChatAction !== undefined)

  if (!onChatAction && !onSetRelation) return children

  return (
    <ContextMenu onOpenChange={(open) => !open && setTarget(null)}>
      <ContextMenuTrigger
        asChild
        onContextMenu={(event) => {
          const next = resolve(event.target)
          // Nothing to offer here (header, empty space): suppressing the
          // event keeps Radix from opening an empty menu.
          if (!showsSomething(next)) {
            event.preventDefault()
            return
          }
          setTarget(next)
        }}
        onPointerDown={(event) => {
          // Touch long-press opens without a contextmenu event.
          if (event.pointerType !== 'mouse') setTarget(resolve(event.target))
        }}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        {target?.folder && onSetRelation ? (
          <CellStateMenuItems
            state={target.chat.folders[target.folder.id] ?? 'none'}
            canSelect={(next) =>
              !wouldEmptyFolderTo(
                target.folder!,
                target.chat.folders[target.folder!.id],
                next,
              )
            }
            onSelect={(next) => {
              if (!target.folder) return
              onSetRelation(
                target.chat,
                target.folder,
                target.chat.folders[target.folder.id],
                next,
              )
            }}
          />
        ) : target && onChatAction ? (
          <ChatActionItems
            chat={target.chat}
            isBlocked={isChatBlocked?.(target.chat.id)}
            onAction={onChatAction}
            Item={ContextMenuItem}
            Separator={ContextMenuSeparator}
          />
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  )
}
