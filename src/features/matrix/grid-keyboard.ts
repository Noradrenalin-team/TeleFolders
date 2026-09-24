import { useLayoutEffect, useRef, useState } from 'react'

/** A focusable cell's place in the matrix's keyboard grid: flag rows first,
 * then chat rows; columns in the table's own order. */
export type GridCell = { row: number; col: number }

const CELL_SELECTOR = '[data-cell-row]'
/** Stands in for "the last column" — `closestInRow` clamps to what exists. */
const LAST_COL = Number.MAX_SAFE_INTEGER

function coordsOf(el: HTMLElement): GridCell {
  return { row: Number(el.dataset.cellRow), col: Number(el.dataset.cellCol) }
}

/** The cell in `row` nearest to `col` — rows don't all have every column
 * focusable (a flag row has nothing in the chat column, say). */
export function closestInRow<T>(
  cells: readonly T[],
  coords: (cell: T) => GridCell,
  row: number,
  col: number,
): T | undefined {
  let best: T | undefined
  let bestDistance = Infinity
  for (const cell of cells) {
    const at = coords(cell)
    if (at.row !== row) continue
    const distance = Math.abs(at.col - col)
    if (distance < bestDistance) {
      best = cell
      bestDistance = distance
    }
  }
  return best
}

export type GridMove =
  | { kind: 'row'; row: number; col: number }
  | { kind: 'step'; step: 'prev' | 'next' }

/** Key → where focus should go (the ARIA grid pattern's key map). */
export function gridMove(
  key: string,
  at: GridCell,
  {
    rowCount,
    pageSize,
    ctrl,
  }: { rowCount: number; pageSize: number; ctrl: boolean },
): GridMove | undefined {
  const toRow = (row: number, col = at.col): GridMove => ({
    kind: 'row',
    row: Math.min(Math.max(row, 0), rowCount - 1),
    col,
  })
  switch (key) {
    case 'ArrowDown':
      return toRow(at.row + 1)
    case 'ArrowUp':
      return toRow(at.row - 1)
    case 'PageDown':
      return toRow(at.row + pageSize)
    case 'PageUp':
      return toRow(at.row - pageSize)
    case 'ArrowRight':
      return { kind: 'step', step: 'next' }
    case 'ArrowLeft':
      return { kind: 'step', step: 'prev' }
    case 'Home':
      return toRow(ctrl ? 0 : at.row, 0)
    case 'End':
      return toRow(ctrl ? rowCount - 1 : at.row, LAST_COL)
    default:
      return undefined
  }
}

/**
 * Roving-tabindex keyboard navigation for the matrix (ТЗ §5, 7.2): the
 * whole grid is one Tab stop, arrows/Page/Home/End move between cells.
 * Rows are virtualized, so a move to a row that isn't rendered yet scrolls
 * it in first and focuses it on the render that brings it into the DOM.
 */
export function useGridKeyboard({
  gridRef,
  rowCount,
  pageSize,
  scrollToRow,
  onSpace,
}: {
  gridRef: React.RefObject<HTMLElement | null>
  rowCount: number
  pageSize: () => number
  scrollToRow: (row: number) => void
  /** Return true when Space was handled (e.g. toggled a row selection). */
  onSpace?: (at: GridCell, shift: boolean) => boolean
}) {
  const [active, setActive] = useState<GridCell>({ row: 0, col: 0 })
  const pendingFocus = useRef(false)

  // Runs after every render on purpose: virtualization swaps rows in and
  // out, and whichever cells are in the DOM right now need their tabIndex.
  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const cells = Array.from(grid.querySelectorAll<HTMLElement>(CELL_SELECTOR))
    const inRow = closestInRow(cells, coordsOf, active.row, active.col)
    const tabStop =
      inRow ?? cells.find((el) => coordsOf(el).col === active.col) ?? cells[0]
    for (const el of cells) {
      const tabIndex = el === tabStop ? '0' : '-1'
      // Only real changes: writing ~1,000 unchanged attributes on every
      // scroll frame still invalidates style for all of them. Compared as
      // the attribute — a button's tabIndex *property* is 0 by default.
      if (el.getAttribute('tabindex') !== tabIndex) {
        el.setAttribute('tabindex', tabIndex)
      }
    }
    if (pendingFocus.current && inRow) {
      pendingFocus.current = false
      inRow.focus()
    }
  })

  function onKeyDown(event: React.KeyboardEvent) {
    const target = event.target as HTMLElement
    if (!target.matches(CELL_SELECTOR) || !gridRef.current) return
    const at = coordsOf(target)

    if (event.key === ' ' && onSpace?.(at, event.shiftKey)) {
      event.preventDefault()
      return
    }

    const move = gridMove(event.key, at, {
      rowCount,
      pageSize: pageSize(),
      ctrl: event.ctrlKey || event.metaKey,
    })
    if (!move) return
    event.preventDefault()

    if (move.kind === 'step') {
      const row = Array.from(
        gridRef.current.querySelectorAll<HTMLElement>(
          `[data-cell-row="${at.row}"]`,
        ),
      ).sort((a, b) => coordsOf(a).col - coordsOf(b).col)
      const nextIndex = row.indexOf(target) + (move.step === 'next' ? 1 : -1)
      if (nextIndex < 0 || nextIndex >= row.length) return
      const next = row[nextIndex]
      setActive(coordsOf(next))
      next.focus()
      return
    }

    setActive({ row: move.row, col: move.col })
    pendingFocus.current = true
    scrollToRow(move.row)
  }

  function onFocus(event: React.FocusEvent) {
    const target = event.target as HTMLElement
    if (!target.matches(CELL_SELECTOR)) return
    const at = coordsOf(target)
    setActive((prev) =>
      prev.row === at.row && prev.col === at.col ? prev : at,
    )
  }

  return { onKeyDown, onFocus }
}
