import { describe, expect, it } from 'vitest'
import {
  FOLDER_COLUMN_MAX_WIDTH,
  FOLDER_COLUMN_WIDTH,
  folderColumnWidth,
} from '#/features/matrix/layout'

describe('folderColumnWidth', () => {
  it('keeps short titles at the minimum width', () => {
    expect(folderColumnWidth('Work')).toBe(FOLDER_COLUMN_WIDTH)
  })

  it('widens the column for a longer title (and its emoji)', () => {
    const plain = folderColumnWidth('Лапочки и котики')
    expect(plain).toBeGreaterThan(FOLDER_COLUMN_WIDTH)
    expect(folderColumnWidth('Лапочки и котики', '🐱')).toBeGreaterThan(plain)
  })

  it('caps very long titles, which then wrap instead', () => {
    expect(folderColumnWidth('x'.repeat(200))).toBe(FOLDER_COLUMN_MAX_WIDTH)
  })
})
