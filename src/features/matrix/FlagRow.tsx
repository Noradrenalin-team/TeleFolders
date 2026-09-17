import type { Folder, FolderFlag } from '#/telegram/types'
import { gridTemplateColumns } from '#/features/matrix/layout'
import { FlagCell } from '#/features/matrix/FlagCell'

export function FlagRow({
  flag,
  label,
  folders,
  onToggle,
  isPending,
}: {
  flag: FolderFlag
  label: string
  folders: Folder[]
  onToggle?: (folder: Folder, flag: FolderFlag, next: boolean) => void
  isPending?: (folderId: number, flag: FolderFlag) => boolean
}) {
  return (
    <div
      role="row"
      className="grid items-center border-b border-border bg-muted"
      style={{ gridTemplateColumns: gridTemplateColumns(folders.length) }}
    >
      <div
        role="rowheader"
        className="sticky left-0 z-10 truncate bg-muted px-3 text-xs text-muted-foreground"
      >
        {label}
      </div>
      <div />
      {folders.map((folder) => (
        <div key={folder.id} className="flex justify-center">
          {folder.readOnly ? (
            <span className="size-8" />
          ) : (
            <FlagCell
              active={folder.flags[flag]}
              label={label}
              pending={isPending?.(folder.id, flag) ?? false}
              onClick={
                onToggle
                  ? () => onToggle(folder, flag, !folder.flags[flag])
                  : undefined
              }
            />
          )}
        </div>
      ))}
      <div />
    </div>
  )
}
