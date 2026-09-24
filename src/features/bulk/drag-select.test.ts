import { describe, expect, it } from 'vitest'
import { dragSelection } from '#/features/bulk/drag-select'

const ids = [10, 20, 30, 40, 50]

describe('dragSelection', () => {
  it('selects every row from the start to the pointer, downwards', () => {
    expect([...dragSelection(new Set(), ids, 1, 3, true)].sort()).toEqual([
      20, 30, 40,
    ])
  })

  it('works upwards too', () => {
    expect([...dragSelection(new Set(), ids, 3, 0, true)].sort()).toEqual([
      10, 20, 30, 40,
    ])
  })

  it('keeps what was selected before the drag outside the range', () => {
    const next = dragSelection(new Set([50]), ids, 0, 1, true)
    expect([...next].sort()).toEqual([10, 20, 50])
  })

  it('shrinks back when the pointer returns (range is recomputed, not accumulated)', () => {
    const before = new Set<number>()
    dragSelection(before, ids, 0, 4, true)
    expect([...dragSelection(before, ids, 0, 1, true)].sort()).toEqual([10, 20])
  })

  it('deselects when the drag started on a selected row', () => {
    const next = dragSelection(new Set(ids), ids, 2, 4, false)
    expect([...next].sort()).toEqual([10, 20])
  })
})
