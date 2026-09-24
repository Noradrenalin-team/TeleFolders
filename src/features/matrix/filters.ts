import { z } from '#/lib/zod'
import type { Chat, PeerKind } from '#/telegram/types'
import { m } from '#/paraglide/messages'

export const matrixSearchSchema = z.object({
  q: z.string().catch(''),
  type: z.enum(['all', 'user', 'bot', 'group', 'channel']).catch('all'),
  archived: z.boolean().catch(false),
  muted: z.boolean().catch(false),
  unread: z.boolean().catch(false),
  noFolder: z.boolean().catch(false),
  sort: z.enum(['default', 'name', 'folders', 'unread']).catch('default'),
  /** F7: which chat's card is open (`/matrix?chat=<id>`), if any. */
  chat: z.number().optional().catch(undefined),
})

export type MatrixSearch = z.infer<typeof matrixSearchSchema>

export const DEFAULT_MATRIX_SEARCH: MatrixSearch = {
  q: '',
  type: 'all',
  archived: false,
  muted: false,
  unread: false,
  noFolder: false,
  sort: 'default',
  chat: undefined,
}

/** Search to open the matrix with: defaults, but with the persisted
 * "show archived" preference (F3.3) instead of always starting hidden. */
export function matrixEntrySearch(showArchived: boolean): MatrixSearch {
  return { ...DEFAULT_MATRIX_SEARCH, archived: showArchived }
}

const TYPE_KINDS: Record<
  Exclude<MatrixSearch['type'], 'all'>,
  ReadonlyArray<PeerKind>
> = {
  user: ['user', 'saved'],
  bot: ['bot'],
  group: ['group', 'supergroup'],
  channel: ['channel'],
}

/** What's actually shown as the chat's name (F2.5: "Избранное" for the
 * user's own saved-messages chat, not its raw title) — search and
 * "sort by name" both go by this, not `chat.title`, so they match what the
 * matrix visibly displays. */
export function chatDisplayTitle(chat: Chat): string {
  return chat.isSelf ? m.matrix_self_label() : chat.title
}

export function filterAndSortChats(
  chats: Chat[],
  search: MatrixSearch,
): Chat[] {
  // Users type "@name" out of habit; strip it so it still matches (F3.1).
  const q = search.q.trim().replace(/^@/, '').toLowerCase()

  let result = chats.filter((chat) => {
    // "Показывать архивные" is a view switch, not an inclusive checkbox —
    // matches the official client's separate Archive section: off shows only
    // the main list, on shows only the archive. Otherwise un-/archiving a
    // chat while the toggle is on never removes it from view (it's included
    // either way), which reads as the action silently doing nothing.
    if (chat.isArchived !== search.archived) return false
    if (search.type !== 'all' && !TYPE_KINDS[search.type].includes(chat.kind))
      return false
    if (search.muted && !chat.isMuted) return false
    if (search.unread && chat.unreadCount === 0) return false
    if (search.noFolder && Object.keys(chat.folders).length > 0) return false
    if (q) {
      const haystack =
        `${chatDisplayTitle(chat)} ${chat.username ?? ''}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })

  if (search.sort === 'name') {
    result = [...result].sort((a, b) =>
      chatDisplayTitle(a).localeCompare(chatDisplayTitle(b)),
    )
  } else if (search.sort === 'unread') {
    result = [...result].sort((a, b) => b.unreadCount - a.unreadCount)
  } else if (search.sort === 'folders') {
    result = [...result].sort(
      (a, b) => Object.keys(b.folders).length - Object.keys(a.folders).length,
    )
  }

  return result
}

/** Whether any search/filter narrows the list beyond "show archived or not"
 * (F2.11: decides between the "no chats" and "nothing matches" empty
 * states — an empty *unfiltered* list isn't the same situation). */
export function hasActiveMatrixFilters(search: MatrixSearch): boolean {
  return (
    search.q.trim() !== '' ||
    search.type !== 'all' ||
    search.muted ||
    search.unread ||
    search.noFolder
  )
}
