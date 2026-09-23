import { useEffect, useRef } from 'react'

/**
 * The selection while a checkbox drag is in progress: every row between
 * where the drag started and where the pointer is now gets `select`, the
 * rest keeps what it had before the drag — so dragging back shrinks the
 * range instead of leaving a trail.
 */
export function dragSelection(
  before: ReadonlySet<number>,
  orderedIds: readonly number[],
  startIndex: number,
  currentIndex: number,
  select: boolean,
): Set<number> {
  const next = new Set(before)
  const [from, to] =
    startIndex <= currentIndex
      ? [startIndex, currentIndex]
      : [currentIndex, startIndex]
  for (const id of orderedIds.slice(from, to + 1)) {
    if (select) next.add(id)
    else next.delete(id)
  }
  return next
}

/** Row element attribute carrying its index in the current (filtered,
 * sorted) list — what the pointer is over during a drag. */
export const ROW_INDEX_ATTR = 'data-row-index'

const EDGE_PX = 48
const MAX_SCROLL_STEP = 18

/**
 * Press on a row checkbox and drag across rows to select (or, starting from
 * a checked row, deselect) all of them. Near the list's top/bottom edge the
 * list scrolls by itself, since rows are virtualized and the ones further
 * away aren't in the DOM to be dragged over.
 */
export function useDragSelect({
  scrollRef,
  orderedIds,
  selected,
  onChange,
}: {
  scrollRef: React.RefObject<HTMLElement | null>
  orderedIds: readonly number[]
  selected: ReadonlySet<number>
  /** `anchor`: the row the drag started on, so a later Shift+click extends
   * from there like after a plain click. */
  onChange: (next: Set<number>, anchor: number) => void
}) {
  // Latest values for the document-level listeners, which outlive renders.
  const latest = useRef({ orderedIds, onChange })
  latest.current = { orderedIds, onChange }
  const cleanup = useRef<(() => void) | null>(null)
  const suppressClick = useRef(false)

  useEffect(() => () => cleanup.current?.(), [])

  function start(rowIndex: number, event: React.PointerEvent) {
    if (event.pointerType !== 'mouse' || event.button !== 0 || event.shiftKey)
      return
    // No text selection / focus jump while dragging; the click that
    // follows this press is swallowed, since the press already toggled.
    event.preventDefault()
    suppressClick.current = true

    const before = new Set(selected)
    const startId = latest.current.orderedIds[rowIndex]
    const select = !before.has(startId)
    let current = rowIndex
    let pointerY = event.clientY
    let pointerX = event.clientX
    let frame = 0

    const apply = () =>
      latest.current.onChange(
        dragSelection(
          before,
          latest.current.orderedIds,
          rowIndex,
          current,
          select,
        ),
        startId,
      )

    const rowUnderPointer = () => {
      const el = document
        .elementFromPoint(pointerX, pointerY)
        ?.closest<HTMLElement>(`[${ROW_INDEX_ATTR}]`)
      const index = el ? Number(el.getAttribute(ROW_INDEX_ATTR)) : NaN
      if (!Number.isNaN(index) && index !== current) {
        current = index
        apply()
      }
    }

    const autoScroll = () => {
      const container = scrollRef.current
      if (container) {
        const box = container.getBoundingClientRect()
        const step =
          pointerY < box.top + EDGE_PX
            ? -Math.min(MAX_SCROLL_STEP, box.top + EDGE_PX - pointerY)
            : pointerY > box.bottom - EDGE_PX
              ? Math.min(MAX_SCROLL_STEP, pointerY - (box.bottom - EDGE_PX))
              : 0
        if (step !== 0) {
          container.scrollTop += step
          rowUnderPointer()
        }
      }
      frame = requestAnimationFrame(autoScroll)
    }

    const onMove = (moveEvent: PointerEvent) => {
      pointerX = moveEvent.clientX
      pointerY = moveEvent.clientY
      rowUnderPointer()
    }
    const stop = () => {
      cleanup.current?.()
      // A release outside the starting checkbox fires no click at all —
      // don't leave the flag set to eat the next unrelated one.
      setTimeout(() => {
        suppressClick.current = false
      })
    }

    cleanup.current?.()
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', stop)
    document.addEventListener('pointercancel', stop)
    frame = requestAnimationFrame(autoScroll)
    cleanup.current = () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', stop)
      document.removeEventListener('pointercancel', stop)
      cleanup.current = null
    }

    apply()
  }

  /** For the checkbox's onClick: true when that click ends a drag and
   * must not toggle again. */
  function consumeClick(): boolean {
    if (!suppressClick.current) return false
    suppressClick.current = false
    return true
  }

  return { start, consumeClick }
}
