import type { ColumnDef } from '@tanstack/react-table'
import type { Chat, Folder } from '#/telegram/types'
import {
  ADD_COLUMN_WIDTH,
  ARCHIVE_COLUMN_WIDTH,
  CHAT_COLUMN_WIDTH,
  folderColumnWidth,
} from '#/features/matrix/layout'

export type MatrixColumnMeta =
  | { kind: 'chat' }
  | { kind: 'archive' }
  | { kind: 'folder'; folder: Folder }
  | { kind: 'add' }

declare module '@tanstack/table-core' {
  interface ColumnMeta<TData, TValue> {
    matrix?: MatrixColumnMeta
  }
}

export const CHAT_COLUMN_ID = 'chat'
export const ARCHIVE_COLUMN_ID = 'archive'
export const ADD_COLUMN_ID = 'add'

export function folderColumnId(folderId: number): string {
  return `folder:${folderId}`
}

/**
 * Column model for the matrix (F2.1): identity, order and width live on the
 * table instead of being re-derived independently by each row component —
 * that's what keeps the sticky first column, the header and every row's
 * width in agreement with each other (see MatrixView.tsx). Cell *content* is
 * still rendered by our own components (ChatRow/FlagRow/MatrixHeader), not
 * through `column.cell` — here the table owns layout, not markup.
 *
 * Column order always mirrors `folders`' own order (the server's folder
 * order, as reordered by `reorderFolders` — see F4.4), so there's no
 * separate `columnOrder` table state to keep in sync.
 */
export function buildMatrixColumns(folders: Folder[]): ColumnDef<Chat>[] {
  return [
    {
      id: CHAT_COLUMN_ID,
      size: CHAT_COLUMN_WIDTH,
      meta: { matrix: { kind: 'chat' } },
    },
    {
      id: ARCHIVE_COLUMN_ID,
      size: ARCHIVE_COLUMN_WIDTH,
      meta: { matrix: { kind: 'archive' } },
    },
    ...folders.map((folder): ColumnDef<Chat> => ({
      id: folderColumnId(folder.id),
      size: folderColumnWidth(folder.title, folder.emoticon),
      meta: { matrix: { kind: 'folder', folder } },
    })),
    {
      id: ADD_COLUMN_ID,
      size: ADD_COLUMN_WIDTH,
      meta: { matrix: { kind: 'add' } },
    },
  ]
}
