export const CHAT_COLUMN_WIDTH = 260
export const ARCHIVE_COLUMN_WIDTH = 72
export const FOLDER_COLUMN_WIDTH = 96
export const ADD_COLUMN_WIDTH = 56

export const ROW_HEIGHT = 44
export const FLAG_ROW_HEIGHT = 36
export const HEADER_ROW_HEIGHT = 44

export function gridTemplateColumns(folderCount: number): string {
  // `repeat(0, ...)` is invalid per the CSS Grid spec (the repeat count must
  // be >= 1), which drops the *entire* grid-template-columns declaration —
  // so the folders segment has to be omitted outright when there are none.
  return [
    `${CHAT_COLUMN_WIDTH}px`,
    `${ARCHIVE_COLUMN_WIDTH}px`,
    folderCount > 0 ? `repeat(${folderCount}, ${FOLDER_COLUMN_WIDTH}px)` : null,
    `${ADD_COLUMN_WIDTH}px`,
  ]
    .filter((part) => part !== null)
    .join(' ')
}
