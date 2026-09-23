import type { ChatFolderRelation, Folder, FolderFlag } from '#/telegram/types'

const CATEGORY_FLAGS: ReadonlyArray<FolderFlag> = [
  'contacts',
  'nonContacts',
  'groups',
  'broadcasts',
  'bots',
]

export function hasAnyCategoryFlag(folder: Folder): boolean {
  return CATEGORY_FLAGS.some((flag) => folder.flags[flag])
}

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
 * disabling, and only when this is the last included/pinned chat.
 *
 * A folder with any category flag on (`contacts`, `groups`, …) is never
 * blocked here even at zero explicit chats: the flag could still pull other
 * chats in, and we can't know that without asking the server.
 */
export function wouldEmptyFolder(
  folder: Folder,
  current: ChatFolderRelation | undefined,
): boolean {
  return (
    current === 'pinned' &&
    folder.includeCount <= 1 &&
    !hasAnyCategoryFlag(folder)
  )
}

/**
 * Same rule (F2.7), for the flag rows: turning off the last active category
 * flag on a folder that has no explicitly included/pinned chat either would
 * leave it with nothing in it.
 */
export function wouldEmptyFolderByFlag(
  folder: Folder,
  flag: FolderFlag,
  nextValue: boolean,
): boolean {
  if (nextValue) return false
  if (!CATEGORY_FLAGS.includes(flag)) return false
  if (folder.includeCount > 0) return false

  const otherFlagActive = CATEGORY_FLAGS.some(
    (f) => f !== flag && folder.flags[f],
  )
  return !otherFlagActive
}
