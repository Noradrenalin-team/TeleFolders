export const CHAT_COLUMN_WIDTH = 260
export const ARCHIVE_COLUMN_WIDTH = 72
export const FOLDER_COLUMN_WIDTH = 96
export const FOLDER_COLUMN_MAX_WIDTH = 200

/**
 * A folder column wide enough for its title, within [96, 200] px — a fixed
 * 96 cut most real folder names down to a few letters. Estimated, not
 * measured: the header's 12px medium font averages ~7px per character
 * (Latin and Cyrillic alike), an emoji ~18px, plus the cell's padding.
 * Longer titles wrap to a second line and keep the full name as a tooltip.
 */
export function folderColumnWidth(title: string, emoticon?: string): number {
  const estimate = 20 + (emoticon ? 18 : 0) + [...title].length * 7
  return Math.min(
    FOLDER_COLUMN_MAX_WIDTH,
    Math.max(FOLDER_COLUMN_WIDTH, estimate),
  )
}
export const ADD_COLUMN_WIDTH = 56

export const ROW_HEIGHT = 44
export const FLAG_ROW_HEIGHT = 36
export const HEADER_ROW_HEIGHT = 44

/** `grid-template-columns` from a table's own column sizes (`column.getSize()`
 * order), so header, flag rows and chat rows never drift out of alignment
 * with each other or with the table's `getTotalSize()` (ТЗ §5 sticky first
 * column/header — see MatrixView.tsx for why the row width itself also has
 * to match `getTotalSize()`, not just this). */
export function gridTemplateColumns(sizes: number[]): string {
  return sizes.map((size) => `${size}px`).join(' ')
}
