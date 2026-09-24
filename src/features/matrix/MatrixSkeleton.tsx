import { useLayoutEffect, useRef, useState } from 'react'
import { Link2, Plus } from 'lucide-react'
import { cn } from 'cn'
import type { Folder } from '#/telegram/types'
import { m } from '#/paraglide/messages'
import {
  FOLDER_COLUMN_WIDTH,
  ROW_HEIGHT,
  gridTemplateColumns,
} from '#/features/matrix/layout'
import { FOLDER_FLAGS } from '#/features/matrix/flags'
import { buildMatrixColumns } from '#/features/matrix/columns'
import type { MatrixColumnMeta } from '#/features/matrix/columns'

/** Stand-in folder columns while the folders themselves haven't arrived. */
const PLACEHOLDER_FOLDER_COUNT = 3
const MAX_ROWS = 15
/** Title bar lengths, cycled so the rows don't look stamped out. */
const TITLE_WIDTHS = [140, 96, 124, 76, 152, 108, 88]

type SkeletonColumn = {
  id: string
  size: number
  meta: MatrixColumnMeta | { kind: 'placeholder' }
}

/**
 * The same columns, in the same order and widths, as the loaded matrix
 * (F2.10) — so nothing moves when the real grid replaces this one. Folders
 * usually load before dialogs; until they do, stand-in folder columns hold
 * their place before "+".
 */
function skeletonColumns(folders: Folder[]): SkeletonColumn[] {
  return buildMatrixColumns(folders).flatMap((def): SkeletonColumn[] => {
    const meta = def.meta?.matrix
    if (!meta || def.id === undefined || def.size === undefined) return []
    const column = { id: def.id, size: def.size, meta }
    if (meta.kind !== 'add' || folders.length > 0) return [column]
    return [
      ...Array.from({ length: PLACEHOLDER_FOLDER_COUNT }, (_, i) => ({
        id: `placeholder:${i}`,
        size: FOLDER_COLUMN_WIDTH,
        meta: { kind: 'placeholder' as const },
      })),
      column,
    ]
  })
}

/**
 * Loading state of MatrixView, laid out as the matrix itself: header, flag
 * rows and chat rows on the same grid tracks. The "Загружено N чатов" status
 * lives in MatrixView's top bar, where the loaded count stays afterwards, so
 * everything here is decorative.
 *
 * Only the placeholder shapes pulse — the real labels (column and folder
 * titles, flag names) stay at full opacity so their contrast holds.
 */
export function MatrixSkeleton({
  folders,
  selectable = false,
}: {
  folders: Folder[]
  /** Whether loaded rows will have a selection checkbox (F6.1). */
  selectable?: boolean
}) {
  const columns = skeletonColumns(folders)
  const template = gridTemplateColumns(columns.map((column) => column.size))
  const totalWidth = columns.reduce((sum, column) => sum + column.size, 0)

  // Only as many rows as fit under the header and flag rows.
  const bodyRef = useRef<HTMLDivElement>(null)
  const [rowCount, setRowCount] = useState(0)
  useLayoutEffect(() => {
    const body = bodyRef.current
    if (!body) return
    const measure = () =>
      setRowCount(Math.min(MAX_ROWS, Math.ceil(body.clientHeight / ROW_HEIGHT)))
    const observer = new ResizeObserver(measure)
    observer.observe(body)
    measure()
    return () => observer.disconnect()
  }, [])

  return (
    <div className="flex flex-1 flex-col overflow-hidden" aria-hidden="true">
      <div style={{ width: totalWidth, minWidth: '100%' }}>
        <div
          className="grid items-center border-b border-border bg-background text-sm font-medium"
          style={{ gridTemplateColumns: template }}
        >
          {columns.map((column) => (
            <HeaderCell
              key={column.id}
              meta={column.meta}
              selectable={selectable}
            />
          ))}
        </div>
        {folders.length > 0 &&
          FOLDER_FLAGS.map(({ flag, label }) => (
            <div
              key={flag}
              className="grid items-center border-b border-border bg-muted"
              style={{ gridTemplateColumns: template }}
            >
              {columns.map((column) =>
                column.meta.kind === 'chat' ? (
                  <div
                    key={column.id}
                    className="sticky left-0 z-10 truncate bg-muted px-3 text-xs text-foreground/80"
                  >
                    {label()}
                  </div>
                ) : column.meta.kind === 'folder' ? (
                  <div key={column.id} className="flex justify-center">
                    <span className="flex size-8 items-center justify-center">
                      {!column.meta.folder.readOnly && (
                        <Bone className="size-4 rounded-full" />
                      )}
                    </span>
                  </div>
                ) : (
                  <div key={column.id} />
                ),
              )}
            </div>
          ))}
      </div>

      <div
        ref={bodyRef}
        className="min-h-0 flex-1"
        style={{ width: totalWidth, minWidth: '100%' }}
      >
        {Array.from({ length: rowCount }, (_, row) => (
          <div
            key={row}
            className="grid items-center border-b border-border"
            style={{ height: ROW_HEIGHT, gridTemplateColumns: template }}
          >
            {columns.map((column) =>
              column.meta.kind === 'chat' ? (
                <div
                  key={column.id}
                  className="sticky left-0 z-10 flex min-w-0 items-center gap-2 bg-background px-3"
                >
                  {selectable && (
                    <Bone className="size-4 shrink-0 rounded-[4px]" />
                  )}
                  <Bone className="size-7 shrink-0 rounded-full" />
                  <Bone
                    className="h-3 rounded-full"
                    style={{ width: TITLE_WIDTHS[row % TITLE_WIDTHS.length] }}
                  />
                </div>
              ) : column.meta.kind === 'add' ? (
                <div key={column.id} />
              ) : (
                <div key={column.id} className="flex justify-center">
                  <Bone className="size-4 rounded-full" />
                </div>
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Mirrors MatrixHeader's cells, minus anything interactive. */
function HeaderCell({
  meta,
  selectable,
}: {
  meta: SkeletonColumn['meta']
  selectable: boolean
}) {
  if (meta.kind === 'chat') {
    return (
      <div className="sticky left-0 z-10 flex items-center gap-2 truncate bg-background px-3">
        {selectable && <Bone className="size-4 shrink-0 rounded-[4px]" />}
        {m.matrix_column_chat()}
      </div>
    )
  }

  if (meta.kind === 'archive') {
    return (
      <div className="truncate text-center text-xs text-muted-foreground">
        {m.matrix_column_archive()}
      </div>
    )
  }

  if (meta.kind === 'add') {
    return (
      <div className="flex justify-center">
        <span className="flex size-8 items-center justify-center text-muted-foreground">
          <Plus className="size-4" />
        </span>
      </div>
    )
  }

  // Same boxes as a real folder title and its counts line, so the header is
  // as tall now as once it's loaded.
  return (
    <div className="flex min-w-0 items-center justify-center px-1">
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1 text-xs">
        {meta.kind === 'folder' ? (
          <>
            <span className="flex min-w-0 max-w-full items-center gap-1">
              {meta.folder.emoticon && (
                <span className="shrink-0">{meta.folder.emoticon}</span>
              )}
              <span className="line-clamp-2 min-w-0 text-center leading-tight break-words">
                {meta.folder.title}
              </span>
              {meta.folder.readOnly && (
                <Link2 className="size-3 shrink-0 text-muted-foreground" />
              )}
            </span>
            {!meta.folder.readOnly && (
              <span className="text-[10px] font-normal text-muted-foreground">
                {meta.folder.includeCount}/{meta.folder.excludeCount}/
                {meta.folder.pinnedCount}
              </span>
            )}
          </>
        ) : (
          <>
            <span className="leading-tight">
              <Bone className="inline-block h-2.5 w-14 rounded-full align-middle" />
            </span>
            <span className="text-[10px]">
              <Bone className="inline-block h-2 w-8 rounded-full align-middle" />
            </span>
          </>
        )}
      </div>
    </div>
  )
}

/** A placeholder shape. Translucent foreground rather than `bg-muted`, so it
 * shows on the muted flag rows as well as on the background. */
function Bone({
  className,
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <span
      className={cn('animate-pulse bg-foreground/10', className)}
      style={style}
    />
  )
}
