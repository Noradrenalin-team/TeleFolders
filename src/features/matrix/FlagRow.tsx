import type { Column } from '@tanstack/react-table'
import type { Chat, Folder, FolderFlag } from '#/telegram/types'
import { gridTemplateColumns } from '#/features/matrix/layout'
import { FlagCell } from '#/features/matrix/FlagCell'
import { wouldEmptyFolderByFlag } from '#/features/matrix/relation-cycle'
import { m } from '#/paraglide/messages'

export function FlagRow({
  flag,
  label,
  columns,
  onToggle,
  isPending,
}: {
  flag: FolderFlag
  label: string
  /** Visible leaf columns, in the table's own order — only `folder` columns
   * actually render a cell here, but every column needs a grid track to stay
   * aligned with the header and chat rows (F2.2). */
  columns: Column<Chat, unknown>[]
  onToggle?: (folder: Folder, flag: FolderFlag, next: boolean) => void
  isPending?: (folderId: number, flag: FolderFlag) => boolean
}) {
  return (
    <div
      role="row"
      className="grid items-center border-b border-border bg-muted"
      style={{
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
              className="sticky left-0 z-10 truncate bg-muted px-3 text-xs text-muted-foreground"
            >
              {label}
            </div>
          )
        }

        if (meta.kind !== 'folder') {
          return <div key={column.id} />
        }

        const folder = meta.folder
        const nextValue = !folder.flags[flag]
        const disabled =
          folder.readOnly || wouldEmptyFolderByFlag(folder, flag, nextValue)

        return (
          <div key={column.id} className="flex justify-center">
            {folder.readOnly ? (
              <span className="size-8" />
            ) : (
              <FlagCell
                active={folder.flags[flag]}
                label={label}
                disabled={disabled}
                disabledReason={m.error_folder_empty()}
                pending={isPending?.(folder.id, flag) ?? false}
                onClick={
                  onToggle ? () => onToggle(folder, flag, nextValue) : undefined
                }
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
