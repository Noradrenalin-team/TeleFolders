import { CirclePlus, Loader2, Minus, Pin, Plus } from 'lucide-react'
import { cn } from 'cn'
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
  pending = false,
  onClick,
}: {
  state: CellState
  disabled?: boolean
  pending?: boolean
  onClick?: () => void
}) {
  const Icon = ICON_BY_STATE[state]
  const label = LABEL_BY_STATE[state]()

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled || pending}
      onClick={onClick}
      className={cn(
        'flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors',
        'hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40',
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
  )
}
