import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MATRIX_SEARCH,
  filterAndSortChats,
  hasActiveMatrixFilters,
} from '#/features/matrix/filters'
import type { Chat } from '#/telegram/types'

function chat(overrides: Partial<Chat> = {}): Chat {
  return {
    id: 1,
    peerId: 1,
    kind: 'user',
    title: 'Alice',
    isPinned: false,
    isArchived: false,
    isMuted: false,
    unreadCount: 0,
    isSelf: false,
    canDelete: true,
    canLeave: false,
    canBlock: true,
    folders: {},
    ...overrides,
  }
}

describe('filterAndSortChats', () => {
  it('"archived" is an exclusive view switch, not an inclusive checkbox', () => {
    const chats = [chat({ id: 1 }), chat({ id: 2, isArchived: true })]

    expect(
      filterAndSortChats(chats, DEFAULT_MATRIX_SEARCH).map((c) => c.id),
    ).toEqual([1])
    expect(
      filterAndSortChats(chats, {
        ...DEFAULT_MATRIX_SEARCH,
        archived: true,
      }).map((c) => c.id),
    ).toEqual([2])
  })

  it('matches search by title and by username, ignoring a leading @ (F3.1)', () => {
    const chats = [
      chat({ id: 1, title: 'Team Chat' }),
      chat({ id: 2, title: 'Other', username: 'support_bot' }),
    ]

    expect(
      filterAndSortChats(chats, { ...DEFAULT_MATRIX_SEARCH, q: 'team' }).map(
        (c) => c.id,
      ),
    ).toEqual([1])
    expect(
      filterAndSortChats(chats, {
        ...DEFAULT_MATRIX_SEARCH,
        q: '@support_bot',
      }).map((c) => c.id),
    ).toEqual([2])
  })

  it('searches the "Избранное" label for the self chat, not its raw title (F2.5)', () => {
    const chats = [chat({ id: 1, title: 'Vasiliy', isSelf: true })]

    expect(
      filterAndSortChats(chats, { ...DEFAULT_MATRIX_SEARCH, q: 'избранное' }),
    ).toHaveLength(1)
  })

  it('filters by type, muted, unread and noFolder', () => {
    const chats = [
      chat({ id: 1, kind: 'user' }),
      chat({ id: 2, kind: 'bot' }),
      chat({ id: 3, isMuted: true }),
      chat({ id: 4, unreadCount: 5 }),
      chat({ id: 5, folders: { 2: 'include' } }),
    ]

    expect(
      filterAndSortChats(chats, {
        ...DEFAULT_MATRIX_SEARCH,
        type: 'bot',
      }).map((c) => c.id),
    ).toEqual([2])
    expect(
      filterAndSortChats(chats, {
        ...DEFAULT_MATRIX_SEARCH,
        muted: true,
      }).map((c) => c.id),
    ).toEqual([3])
    expect(
      filterAndSortChats(chats, {
        ...DEFAULT_MATRIX_SEARCH,
        unread: true,
      }).map((c) => c.id),
    ).toEqual([4])
    expect(
      filterAndSortChats(chats, {
        ...DEFAULT_MATRIX_SEARCH,
        noFolder: true,
      }).map((c) => c.id),
    ).toEqual([1, 2, 3, 4])
  })

  it('sorts by unread count descending', () => {
    const chats = [
      chat({ id: 1, unreadCount: 1 }),
      chat({ id: 2, unreadCount: 9 }),
    ]

    expect(
      filterAndSortChats(chats, {
        ...DEFAULT_MATRIX_SEARCH,
        sort: 'unread',
      }).map((c) => c.id),
    ).toEqual([2, 1])
  })
})

describe('hasActiveMatrixFilters', () => {
  it('is false for the defaults (archived alone is a preference, not a filter)', () => {
    expect(hasActiveMatrixFilters(DEFAULT_MATRIX_SEARCH)).toBe(false)
    expect(
      hasActiveMatrixFilters({ ...DEFAULT_MATRIX_SEARCH, archived: true }),
    ).toBe(false)
  })

  it('is true once search, type, muted, unread or noFolder narrow the list', () => {
    expect(hasActiveMatrixFilters({ ...DEFAULT_MATRIX_SEARCH, q: 'x' })).toBe(
      true,
    )
    expect(
      hasActiveMatrixFilters({ ...DEFAULT_MATRIX_SEARCH, type: 'bot' }),
    ).toBe(true)
    expect(
      hasActiveMatrixFilters({ ...DEFAULT_MATRIX_SEARCH, noFolder: true }),
    ).toBe(true)
  })
})
