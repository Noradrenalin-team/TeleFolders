import { Link2, Plus } from 'lucide-react'
import { Button } from '#/components/ui/button'
import type { Folder } from '#/telegram/types'
import { m } from '#/paraglide/messages'
import { gridTemplateColumns } from '#/features/matrix/layout'

export function MatrixHeader({
  folders,
  onAddFolder,
  onSelectFolder,
}: {
  folders: Folder[]
  onAddFolder?: () => void
  onSelectFolder?: (folder: Folder) => void
}) {
  return (
    <div
      role="row"
      className="grid items-center border-b border-border bg-background text-sm font-medium"
      style={{ gridTemplateColumns: gridTemplateColumns(folders.length) }}
    >
      <div
        role="columnheader"
        className="sticky left-0 z-10 truncate bg-background px-3"
      >
        {m.matrix_column_chat()}
      </div>
      <div
        role="columnheader"
        className="truncate text-center text-xs text-muted-foreground"
      >
        {m.matrix_column_archive()}
      </div>
      {folders.map((folder) => (
        <button
          key={folder.id}
          type="button"
          role="columnheader"
          disabled={!onSelectFolder || folder.readOnly}
          onClick={onSelectFolder ? () => onSelectFolder(folder) : undefined}
          className="flex min-w-0 flex-col items-center justify-center gap-0.5 truncate px-1 py-1 text-xs enabled:hover:bg-accent disabled:cursor-default"
          title={folder.title}
        >
          <span className="flex min-w-0 items-center gap-1 truncate">
            {folder.emoticon && (
              <span aria-hidden="true">{folder.emoticon}</span>
            )}
            <span className="truncate">{folder.title}</span>
            {folder.readOnly && (
              <Link2
                className="size-3 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            )}
          </span>
          {!folder.readOnly && (
            <span
              className="text-[10px] font-normal text-muted-foreground"
              title={m.matrix_folder_counts({
                include: folder.includeCount,
                exclude: folder.excludeCount,
                pinned: folder.pinnedCount,
              })}
            >
              {folder.includeCount}/{folder.excludeCount}/{folder.pinnedCount}
            </span>
          )}
        </button>
      ))}
      <div className="flex justify-center">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={m.matrix_column_add()}
          title={m.matrix_column_add()}
          onClick={onAddFolder}
        >
          <Plus aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
