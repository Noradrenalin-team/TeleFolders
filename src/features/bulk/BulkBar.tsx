import {
  Archive,
  ArchiveRestore,
  Ban,
  Bell,
  BellOff,
  CheckCheck,
  ChevronDown,
  FolderMinus,
  FolderPlus,
  FolderX,
  LogOut,
  Trash2,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Button } from '#/components/ui/button'
import type {
  BulkAction,
  BulkChatAction,
  BulkFolderAction,
} from '#/features/bulk/bulk-actions'
import type { Folder } from '#/telegram/types'
import { m } from '#/paraglide/messages'

const CHAT_ACTIONS: {
  type: BulkChatAction['type']
  icon: LucideIcon
  destructive?: boolean
}[] = [
  { type: 'archive', icon: Archive },
  { type: 'unarchive', icon: ArchiveRestore },
  { type: 'mute', icon: BellOff },
  { type: 'unmute', icon: Bell },
  { type: 'markRead', icon: CheckCheck },
  { type: 'leave', icon: LogOut, destructive: true },
  { type: 'delete', icon: Trash2, destructive: true },
  { type: 'block', icon: Ban, destructive: true },
]

const RELATIONS: {
  relation: BulkFolderAction['relation']
  icon: LucideIcon
  label: () => string
}[] = [
  {
    relation: 'include',
    icon: FolderPlus,
    label: () => m.bulk_folder_include(),
  },
  {
    relation: 'exclude',
    icon: FolderMinus,
    label: () => m.bulk_folder_exclude(),
  },
  { relation: null, icon: FolderX, label: () => m.bulk_folder_clear() },
]

export function bulkActionLabel(action: BulkAction): string {
  switch (action.type) {
    case 'folder':
      return action.relation === 'include'
        ? m.bulk_folder_include_into({ folder: action.folder.title })
        : action.relation === 'exclude'
          ? m.bulk_folder_exclude_from({ folder: action.folder.title })
          : m.bulk_folder_clear_from({ folder: action.folder.title })
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
    case 'leave':
      return m.bulk_leave()
    case 'delete':
      return m.bulk_delete()
    case 'block':
      return m.chat_action_block()
  }
}

/**
 * F6.2 bar under the matrix while chats are selected. Each entry shows how
 * many of the selected chats it would actually change and is disabled when
 * that's none — so "mute 0 chats" is never offered.
 */
export function BulkBar({
  selectedCount,
  matchingCount,
  folders,
  applicableCount,
  disabled = false,
  onRun,
  onSelectAllMatching,
  onClear,
}: {
  selectedCount: number
  /** Chats matching the current filter — the "select all" target (F6.1). */
  matchingCount: number
  folders: Folder[]
  applicableCount: (action: BulkAction) => number
  disabled?: boolean
  onRun: (action: BulkAction) => void
  onSelectAllMatching: () => void
  onClear: () => void
}) {
  const editableFolders = folders.filter((folder) => !folder.readOnly)

  return (
    <div
      role="region"
      aria-label={m.bulk_toolbar()}
      className="flex flex-wrap items-center gap-2 border-t border-border bg-background px-3 py-2 text-sm"
    >
      <span className="font-medium" aria-live="polite">
        {m.bulk_selected_count({ count: selectedCount })}
      </span>
      {selectedCount < matchingCount && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="px-1"
          onClick={onSelectAllMatching}
        >
          {m.bulk_select_all_matching({ count: matchingCount })}
        </Button>
      )}

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || editableFolders.length === 0}
            >
              <FolderPlus aria-hidden="true" />
              {m.bulk_folders_menu()}
              <ChevronDown aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
            {RELATIONS.map(({ relation, icon: Icon, label }, index) => (
              <div key={String(relation)} role="group" aria-label={label()}>
                {index > 0 && <DropdownMenuSeparator />}
                <p className="px-2 py-1 text-xs text-muted-foreground">
                  {label()}
                </p>
                {editableFolders.map((folder) => {
                  const action: BulkFolderAction = {
                    type: 'folder',
                    folder,
                    relation,
                  }
                  const count = applicableCount(action)
                  return (
                    <DropdownMenuItem
                      key={folder.id}
                      disabled={count === 0}
                      onSelect={() => onRun(action)}
                    >
                      <Icon aria-hidden="true" />
                      <span className="truncate">
                        {folder.emoticon ? `${folder.emoticon} ` : ''}
                        {folder.title}
                      </span>
                      <span className="ml-auto pl-3 text-xs text-muted-foreground">
                        {count}
                      </span>
                    </DropdownMenuItem>
                  )
                })}
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
            >
              {m.bulk_actions_menu()}
              <ChevronDown aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {CHAT_ACTIONS.map(({ type, icon: Icon, destructive }, index) => {
              const action: BulkChatAction = { type }
              const count = applicableCount(action)
              const firstDestructive =
                destructive && !CHAT_ACTIONS[index - 1].destructive
              return (
                <div key={type}>
                  {firstDestructive && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    variant={destructive ? 'destructive' : 'default'}
                    disabled={count === 0}
                    onSelect={() => onRun(action)}
                  >
                    <Icon aria-hidden="true" />
                    {bulkActionLabel(action)}
                    <span className="ml-auto pl-3 text-xs text-muted-foreground">
                      {count}
                    </span>
                  </DropdownMenuItem>
                </div>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={onClear}
        >
          <X aria-hidden="true" />
          {m.bulk_clear_selection()}
        </Button>
      </div>
    </div>
  )
}
