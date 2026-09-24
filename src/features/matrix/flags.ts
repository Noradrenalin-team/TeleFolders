import type { FolderFlag } from '#/telegram/types'
import { m } from '#/paraglide/messages'

/** Order the 8 flag rows render in (F2.2), grouped include-category first, exclude-rule last. */
export const FOLDER_FLAGS: ReadonlyArray<{
  flag: FolderFlag
  label: () => string
}> = [
  { flag: 'contacts', label: () => m.matrix_flag_contacts() },
  { flag: 'nonContacts', label: () => m.matrix_flag_non_contacts() },
  { flag: 'groups', label: () => m.matrix_flag_groups() },
  { flag: 'broadcasts', label: () => m.matrix_flag_broadcasts() },
  { flag: 'bots', label: () => m.matrix_flag_bots() },
  { flag: 'excludeMuted', label: () => m.matrix_flag_exclude_muted() },
  { flag: 'excludeRead', label: () => m.matrix_flag_exclude_read() },
  { flag: 'excludeArchived', label: () => m.matrix_flag_exclude_archived() },
]
