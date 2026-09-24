import { describe, expect, it } from 'vitest'
import { closestInRow, gridMove } from '#/features/matrix/grid-keyboard'
import type { GridCell } from '#/features/matrix/grid-keyboard'

const opts = { rowCount: 10, pageSize: 4, ctrl: false }

describe('gridMove', () => {
  it('moves by rows, keeping the column', () => {
    expect(gridMove('ArrowDown', { row: 2, col: 3 }, opts)).toEqual({
      kind: 'row',
      row: 3,
      col: 3,
    })
    expect(gridMove('PageUp', { row: 6, col: 1 }, opts)).toEqual({
      kind: 'row',
      row: 2,
      col: 1,
    })
  })

  it('stops at the edges', () => {
    expect(gridMove('ArrowUp', { row: 0, col: 0 }, opts)).toMatchObject({
      row: 0,
    })
    expect(gridMove('PageDown', { row: 8, col: 0 }, opts)).toMatchObject({
      row: 9,
    })
  })

  it('steps within the row horizontally', () => {
    expect(gridMove('ArrowRight', { row: 1, col: 1 }, opts)).toEqual({
      kind: 'step',
      step: 'next',
    })
  })

  it('Home/End go to the row ends, with Ctrl to the grid ends', () => {
    expect(gridMove('Home', { row: 5, col: 4 }, opts)).toMatchObject({
      row: 5,
      col: 0,
    })
    expect(
      gridMove('End', { row: 5, col: 0 }, { ...opts, ctrl: true }),
    ).toMatchObject({ row: 9 })
  })

  it('ignores other keys (Enter/Space stay native clicks)', () => {
    expect(gridMove('Enter', { row: 0, col: 0 }, opts)).toBeUndefined()
  })
})

describe('closestInRow', () => {
  const cells: GridCell[] = [
    { row: 0, col: 2 },
    { row: 0, col: 3 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 1, col: 2 },
  ]
  const self = (c: GridCell) => c

  it('lands on the nearest column the row actually has', () => {
    expect(closestInRow(cells, self, 0, 0)).toEqual({ row: 0, col: 2 })
    expect(closestInRow(cells, self, 1, 99)).toEqual({ row: 1, col: 2 })
  })

  it('returns nothing for a row that is not rendered', () => {
    expect(closestInRow(cells, self, 7, 0)).toBeUndefined()
  })
})
