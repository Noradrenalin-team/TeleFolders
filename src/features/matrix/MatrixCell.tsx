import { CirclePlus, Loader2, Minus, Pin, Plus } from 'lucide-react'
import { cn } from 'cn'
import type { GridCell } from '#/features/matrix/grid-keyboard'
import type { ChatFolderRelation } from '#/telegram/types'
import { m } from '#/paraglide/messages'

export type CellState = ChatFolderRelation | 'none'

const ICON_BY_STATE: Record<CellState, typeof Plus> = {
  none: Plus,
  include: CirclePlus,
  pinned: Pin,
  exclude: Minus,
}

const LABEL_BY_STATE: Record<CellState, () => string> = {
  none: () => m.matrix_cell_none(),
  include: () => m.matrix_cell_include(),
  pinned: () => m.matrix_cell_pinned(),
  exclude: () => m.matrix_cell_exclude(),
}

export function MatrixCell({
  state,
  disabled = false,
  /** Shown as a tooltip on the wrapper when `disabled` — see `FlagCell` for
   * why it can't just be a `title` on the (disabled) button itself. */
  disabledReason,
  pending = false,
  cell,
  onClick,
}: {
  state: CellState
  disabled?: boolean
  disabledReason?: string
  pending?: boolean
  /** Position in the matrix's keyboard grid (see `useGridKeyboard`). */
  cell?: GridCell
  onClick?: () => void
}) {
  // aria-disabled, not disabled: a disabled button can't take focus, so
  // arrow-key navigation would silently skip it and the reason it's off
  // would never be announced.
  const inactive = disabled || pending
  const Icon = ICON_BY_STATE[state]
  const label = LABEL_BY_STATE[state]()

  return (
    <span
      className="inline-flex"
      title={disabled && !pending ? disabledReason : undefined}
    >
      <button
        type="button"
        aria-label={label}
        title={disabled ? undefined : label}
        aria-disabled={inactive || undefined}
        aria-busy={pending || undefined}
        data-cell-row={cell?.row}
        data-cell-col={cell?.col}
        onClick={inactive ? undefined : onClick}
        className={cn(
          'flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors',
          'hover:bg-accent hover:text-accent-foreground aria-disabled:pointer-events-none aria-disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring',
          state === 'include' && 'text-foreground',
          state === 'pinned' && 'text-primary',
          state === 'exclude' && 'text-destructive',
        )}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Icon className="size-4" aria-hidden="true" />
        )}
      </button>
    </span>
  )
}
