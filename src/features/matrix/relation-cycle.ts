import type { ChatFolderRelation, Folder } from '#/telegram/types'

/** F2.3: none → include → pinned → exclude → none. */
export function nextRelation(
  current: ChatFolderRelation | undefined,
): ChatFolderRelation | null {
  switch (current) {
    case undefined:
      return 'include'
    case 'include':
      return 'pinned'
    case 'pinned':
      return 'exclude'
    case 'exclude':
      return null
  }
}

/**
 * F2.7: a folder can't be emptied out. Of the cycle's transitions, only
 * `pinned → exclude` actually drops a chat out of the folder's include set
 * (`include → pinned` stays included) — so that's the only one worth
 * disabling, and only when this is the last included chat.
 */
export function wouldEmptyFolder(
  folder: Folder,
  current: ChatFolderRelation | undefined,
): boolean {
  return current === 'pinned' && folder.includeCount <= 1
}
