import { describe, expect, it } from 'vitest'
import { toggleSelection } from '#/features/bulk/selection'

const ids = [10, 20, 30, 40, 50]

describe('toggleSelection', () => {
  it('toggles a single row', () => {
    const on = toggleSelection(new Set(), ids, 30, undefined, false)
    expect([...on.selected]).toEqual([30])
    const off = toggleSelection(on.selected, ids, 30, on.anchor, false)
    expect([...off.selected]).toEqual([])
  })

  it('selects a range with Shift, in either direction', () => {
    const first = toggleSelection(new Set(), ids, 40, undefined, false)
    const range = toggleSelection(first.selected, ids, 20, first.anchor, true)
    expect([...range.selected].sort()).toEqual([20, 30, 40])
  })

  it('deselects a range when the clicked row was selected', () => {
    const all = new Set(ids)
    const result = toggleSelection(all, ids, 40, 20, true)
    expect([...result.selected].sort()).toEqual([10, 50])
  })

  it('falls back to a single toggle when the anchor was filtered out', () => {
    const result = toggleSelection(new Set(), ids, 30, 999, true)
    expect([...result.selected]).toEqual([30])
  })
})
