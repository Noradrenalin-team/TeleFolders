import { Circle, CircleDot, Loader2 } from 'lucide-react'
import { cn } from 'cn'
import type { GridCell } from '#/features/matrix/grid-keyboard'

export function FlagCell({
  active,
  label,
  disabled = false,
  /** Shown as a tooltip on the wrapper when `disabled` — a `title` on the
   * button itself never fires once `disabled`, since disabled elements get
   * `pointer-events: none` and don't receive hover events at all. */
  disabledReason,
  pending = false,
  cell,
  onClick,
}: {
  active: boolean
  label: string
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
  const Icon = active ? CircleDot : Circle

  return (
    <span
      className="inline-flex"
      title={disabled && !pending ? disabledReason : undefined}
    >
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        title={disabled ? undefined : label}
        aria-disabled={inactive || undefined}
        aria-busy={pending || undefined}
        data-cell-row={cell?.row}
        data-cell-col={cell?.col}
        onClick={inactive ? undefined : onClick}
        className={cn(
          'flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors',
          'hover:bg-accent hover:text-accent-foreground aria-disabled:pointer-events-none aria-disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring',
          active && 'text-primary',
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
