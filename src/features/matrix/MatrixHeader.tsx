import { useState } from 'react'
import { ChevronLeft, ChevronRight, Link2, Plus } from 'lucide-react'
import type { Column } from '@tanstack/react-table'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import type { Chat, Folder } from '#/telegram/types'
import { m } from '#/paraglide/messages'
import { gridTemplateColumns } from '#/features/matrix/layout'
import type { MatrixColumnMeta } from '#/features/matrix/columns'

function folderOf(column: Column<Chat, unknown>): Folder | undefined {
  const meta = column.columnDef.meta?.matrix
  return meta?.kind === 'folder' ? meta.folder : undefined
}

export function MatrixHeader({
  columns,
  onAddFolder,
  onSelectFolder,
  onReorderFolders,
  selectAll,
}: {
  /** Visible leaf columns, in the table's own order (F2.1/F4.4). */
  columns: Column<Chat, unknown>[]
  onAddFolder?: () => void
  onSelectFolder?: (folder: Folder) => void
  /** Called with the full, reordered list of folder ids after a drag or a
   * keyboard move (F4.4). */
  onReorderFolders?: (folderIds: number[]) => void
  /** "Select every chat matching the current filter" (F6.1). */
  selectAll?: SelectAllState
}) {
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const folderIds = columns
    .map(folderOf)
    .filter((f) => f !== undefined)
    .map((f) => f.id)

  function moveFolder(folderId: number, targetId: number) {
    if (folderId === targetId) return
    const fromIndex = folderIds.indexOf(folderId)
    const toIndex = folderIds.indexOf(targetId)
    if (fromIndex === -1 || toIndex === -1) return
    const next = [...folderIds]
    next.splice(fromIndex, 1)
    next.splice(toIndex, 0, folderId)
    onReorderFolders?.(next)
  }

  function moveByOffset(folderId: number, offset: -1 | 1) {
    const index = folderIds.indexOf(folderId)
    const targetIndex = index + offset
    if (index === -1 || targetIndex < 0 || targetIndex >= folderIds.length)
      return
    moveFolder(folderId, folderIds[targetIndex])
  }

  return (
    <div
      role="row"
      className="grid items-center border-b border-border bg-background text-sm font-medium"
      style={{
        gridTemplateColumns: gridTemplateColumns(
          columns.map((c) => c.getSize()),
        ),
      }}
    >
      {columns.map((column) => {
        const meta = column.columnDef.meta?.matrix
        if (!meta) return null
        return (
          <HeaderCell
            key={column.id}
            meta={meta}
            selectAll={selectAll}
            draggingId={draggingId}
            onAddFolder={onAddFolder}
            onSelectFolder={onSelectFolder}
            onDragStart={(id) => setDraggingId(id)}
            onDragEnd={() => setDraggingId(null)}
            onDropOn={(targetId) => {
              if (draggingId !== null) moveFolder(draggingId, targetId)
              setDraggingId(null)
            }}
            onMoveByOffset={moveByOffset}
            canMoveLeft={(id) => folderIds.indexOf(id) > 0}
            canMoveRight={(id) => folderIds.indexOf(id) < folderIds.length - 1}
          />
        )
      })}
    </div>
  )
}

export type SelectAllState = {
  checked: boolean | 'indeterminate'
  onToggle: () => void
}

function HeaderCell({
  meta,
  selectAll,
  draggingId,
  onAddFolder,
  onSelectFolder,
  onDragStart,
  onDragEnd,
  onDropOn,
  onMoveByOffset,
  canMoveLeft,
  canMoveRight,
}: {
  meta: MatrixColumnMeta
  selectAll?: SelectAllState
  draggingId: number | null
  onAddFolder?: () => void
  onSelectFolder?: (folder: Folder) => void
  onDragStart: (folderId: number) => void
  onDragEnd: () => void
  onDropOn: (folderId: number) => void
  onMoveByOffset: (folderId: number, offset: -1 | 1) => void
  canMoveLeft: (folderId: number) => boolean
  canMoveRight: (folderId: number) => boolean
}) {
  if (meta.kind === 'chat') {
    return (
      <div
        role="columnheader"
        className="sticky left-0 z-10 flex items-center gap-2 truncate bg-background px-3"
      >
        {selectAll && (
          <Checkbox
            checked={selectAll.checked}
            onCheckedChange={selectAll.onToggle}
            aria-label={m.bulk_select_all()}
            title={m.bulk_select_all()}
          />
        )}
        {m.matrix_column_chat()}
      </div>
    )
  }

  if (meta.kind === 'archive') {
    return (
      <div
        role="columnheader"
        className="truncate text-center text-xs text-muted-foreground"
      >
        {m.matrix_column_archive()}
      </div>
    )
  }

  if (meta.kind === 'add') {
    return (
      <div role="columnheader" className="flex justify-center">
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
    )
  }

  const { folder } = meta

  return (
    <div
      role="columnheader"
      // relative: the reorder arrows overlay the title on hover/focus instead
      // of permanently taking 48 of the column's pixels away from it.
      className="group/folder-header relative flex min-w-0 items-center justify-center px-1"
      onDragOver={(event) => {
        if (folder.readOnly) return
        event.preventDefault()
      }}
      onDrop={(event) => {
        if (folder.readOnly) return
        event.preventDefault()
        onDropOn(folder.id)
      }}
    >
      {!folder.readOnly && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="absolute left-0 z-10 bg-background opacity-0 group-hover/folder-header:opacity-100 focus-visible:opacity-100 disabled:hidden"
          aria-label={m.matrix_folder_move_left()}
          disabled={!canMoveLeft(folder.id)}
          onClick={() => onMoveByOffset(folder.id, -1)}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
      )}

      <button
        type="button"
        disabled={!onSelectFolder || folder.readOnly}
        draggable={!folder.readOnly}
        onDragStart={() => onDragStart(folder.id)}
        onDragEnd={onDragEnd}
        onClick={onSelectFolder ? () => onSelectFolder(folder) : undefined}
        className={
          'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-sm py-1 text-xs enabled:hover:bg-accent disabled:cursor-default' +
          (draggingId === folder.id ? ' opacity-50' : '')
        }
        title={folder.title}
      >
        <span className="flex min-w-0 max-w-full items-center gap-1">
          {folder.emoticon && (
            <span className="shrink-0" aria-hidden="true">
              {folder.emoticon}
            </span>
          )}
          <span className="line-clamp-2 min-w-0 text-center leading-tight break-words">
            {folder.title}
          </span>
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

      {!folder.readOnly && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="absolute right-0 z-10 bg-background opacity-0 group-hover/folder-header:opacity-100 focus-visible:opacity-100 disabled:hidden"
          aria-label={m.matrix_folder_move_right()}
          disabled={!canMoveRight(folder.id)}
          onClick={() => onMoveByOffset(folder.id, 1)}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      )}
    </div>
  )
}
