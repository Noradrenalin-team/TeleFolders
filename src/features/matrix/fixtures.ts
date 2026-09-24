import type { Chat, Folder } from '#/telegram/types'

export const FIXTURE_FOLDERS: Folder[] = [
  {
    id: 2,
    title: 'Работа',
    emoticon: '💼',
    flags: {
      contacts: false,
      nonContacts: false,
      groups: true,
      broadcasts: false,
      bots: false,
      excludeMuted: false,
      excludeRead: false,
      excludeArchived: true,
    },
    includeCount: 2,
    excludeCount: 1,
    pinnedCount: 1,
    readOnly: false,
  },
  {
    id: 3,
    title: 'Учёба',
    emoticon: '📚',
    flags: {
      contacts: false,
      nonContacts: false,
      groups: false,
      broadcasts: true,
      bots: false,
      excludeMuted: true,
      excludeRead: false,
      excludeArchived: false,
    },
    includeCount: 1,
    excludeCount: 0,
    pinnedCount: 0,
    readOnly: false,
  },
  {
    id: 4,
    title: 'Общий чатлист',
    emoticon: '🔗',
    flags: {
      contacts: false,
      nonContacts: false,
      groups: false,
      broadcasts: false,
      bots: false,
      excludeMuted: false,
      excludeRead: false,
      excludeArchived: false,
    },
    includeCount: 1,
    excludeCount: 0,
    pinnedCount: 0,
    readOnly: true,
  },
]

export const FIXTURE_CHATS: Chat[] = [
  {
    id: 1,
    peerId: 1,
    kind: 'saved',
    title: 'Vasiliy',
    isPinned: false,
    isArchived: false,
    isMuted: false,
    unreadCount: 0,
    isSelf: true,
    canDelete: true,
    canLeave: false,
    canBlock: false,
    isOwner: false,
    folders: {},
  },
  {
    id: 2,
    peerId: 2,
    kind: 'user',
    title: 'Команда',
    username: 'team_friend',
    isPinned: true,
    isArchived: false,
    isMuted: false,
    unreadCount: 3,
    isSelf: false,
    canDelete: true,
    canLeave: false,
    canBlock: true,
    isOwner: false,
    folders: { 2: 'pinned' },
  },
  {
    id: 3,
    peerId: 3,
    kind: 'group',
    title: 'Проектная группа',
    isPinned: false,
    isArchived: false,
    isMuted: true,
    unreadCount: 0,
    isSelf: false,
    canDelete: false,
    canLeave: true,
    canBlock: false,
    isOwner: true,
    folders: { 2: 'include' },
  },
  {
    id: 4,
    peerId: 4,
    kind: 'channel',
    title: 'Новости TanStack',
    username: 'tanstack_news',
    isPinned: false,
    isArchived: false,
    isMuted: false,
    unreadCount: 12,
    isSelf: false,
    canDelete: false,
    canLeave: true,
    canBlock: false,
    isOwner: false,
    folders: { 3: 'include', 4: 'include' },
  },
  {
    id: 5,
    peerId: 5,
    kind: 'bot',
    title: 'Support Bot',
    username: 'support_bot',
    isPinned: false,
    isArchived: true,
    isMuted: true,
    unreadCount: 0,
    isSelf: false,
    canDelete: true,
    canLeave: false,
    canBlock: true,
    isOwner: false,
    folders: { 2: 'exclude' },
  },
  {
    id: 6,
    peerId: 6,
    kind: 'supergroup',
    title: 'Архив обсуждений',
    isPinned: false,
    isArchived: true,
    isMuted: false,
    unreadCount: 0,
    isSelf: false,
    canDelete: false,
    canLeave: true,
    canBlock: false,
    isOwner: false,
    folders: {},
  },
]

const KINDS: Chat['kind'][] = ['user', 'group', 'supergroup', 'channel', 'bot']

/**
 * A large, deterministic account for performance checks (ТЗ §6: 2000 chats
 * × 20 folders must scroll at ≥ 50 fps). Every chat sits in a few folders
 * with mixed relations, so every cell state gets rendered.
 */
export function largeFixture(
  chatCount = 2000,
  folderCount = 20,
): { chats: Chat[]; folders: Folder[] } {
  const folders: Folder[] = Array.from({ length: folderCount }, (_, i) => ({
    ...FIXTURE_FOLDERS[0],
    id: 100 + i,
    title: `Папка ${i + 1}`,
    emoticon: undefined,
    includeCount: 50,
    excludeCount: 5,
    pinnedCount: 1,
  }))
  const relations = ['include', 'pinned', 'exclude'] as const
  const chats: Chat[] = Array.from({ length: chatCount }, (_, i) => {
    const kind = KINDS[i % KINDS.length]
    const chatFolders: Chat['folders'] = {}
    for (let f = 0; f < folderCount; f++) {
      if ((i + f) % 4 === 0) chatFolders[100 + f] = relations[(i + f) % 3]
    }
    return {
      id: 10_000 + i,
      peerId: 10_000 + i,
      kind,
      title: `Чат номер ${i + 1}`,
      isPinned: i % 50 === 0,
      isArchived: i % 7 === 0,
      isMuted: i % 5 === 0,
      unreadCount: i % 3 === 0 ? i % 40 : 0,
      isSelf: false,
      canDelete: kind === 'user' || kind === 'bot',
      canLeave: kind !== 'user' && kind !== 'bot',
      canBlock: kind === 'user' || kind === 'bot',
      isOwner: false,
      folders: chatFolders,
    }
  })
  return { chats, folders }
}
