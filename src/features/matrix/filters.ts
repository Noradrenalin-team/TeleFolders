import { z } from 'zod'
import type { Chat, PeerKind } from '#/telegram/types'

export const matrixSearchSchema = z.object({
  q: z.string().catch(''),
  type: z.enum(['all', 'user', 'bot', 'group', 'channel']).catch('all'),
  archived: z.boolean().catch(false),
  muted: z.boolean().catch(false),
  unread: z.boolean().catch(false),
  noFolder: z.boolean().catch(false),
  sort: z.enum(['default', 'name', 'folders', 'unread']).catch('default'),
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

export function filterAndSortChats(
  chats: Chat[],
  search: MatrixSearch,
): Chat[] {
  const q = search.q.trim().toLowerCase()

  let result = chats.filter((chat) => {
    if (!search.archived && chat.isArchived) return false
    if (search.type !== 'all' && !TYPE_KINDS[search.type].includes(chat.kind))
      return false
    if (search.muted && !chat.isMuted) return false
    if (search.unread && chat.unreadCount === 0) return false
    if (search.noFolder && Object.keys(chat.folders).length > 0) return false
    if (q) {
      const haystack = `${chat.title} ${chat.username ?? ''}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })

  if (search.sort === 'name') {
    result = [...result].sort((a, b) => a.title.localeCompare(b.title))
  } else if (search.sort === 'unread') {
    result = [...result].sort((a, b) => b.unreadCount - a.unreadCount)
  } else if (search.sort === 'folders') {
    result = [...result].sort(
      (a, b) => Object.keys(b.folders).length - Object.keys(a.folders).length,
    )
  }

  return result
}
