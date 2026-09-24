import { describe, expect, it } from 'vitest'
import {
  nextRelation,
  wouldEmptyFolder,
  wouldEmptyFolderByFlag,
  wouldEmptyFolderTo,
} from '#/features/matrix/relation-cycle'
import type { Folder } from '#/telegram/types'

function folder(overrides: Partial<Folder> = {}): Folder {
  return {
    id: 1,
    title: 'Work',
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
    includeCount: 0,
    excludeCount: 0,
    pinnedCount: 0,
    readOnly: false,
    ...overrides,
  }
}

describe('nextRelation', () => {
  it('cycles none → include → pinned → exclude → none (F2.3)', () => {
    expect(nextRelation(undefined)).toBe('include')
    expect(nextRelation('include')).toBe('pinned')
    expect(nextRelation('pinned')).toBe('exclude')
    expect(nextRelation('exclude')).toBeNull()
  })
})

describe('wouldEmptyFolder', () => {
  it('blocks pinned → exclude when this is the last chat in the folder', () => {
    expect(wouldEmptyFolder(folder({ includeCount: 1 }), 'pinned')).toBe(true)
  })

  it('allows pinned → exclude when other chats remain', () => {
    expect(wouldEmptyFolder(folder({ includeCount: 2 }), 'pinned')).toBe(false)
  })

  it('never blocks include → pinned (still included either way)', () => {
    expect(wouldEmptyFolder(folder({ includeCount: 1 }), 'include')).toBe(false)
  })

  it('does not block an otherwise-empty folder that has a category flag on', () => {
    expect(
      wouldEmptyFolder(
        folder({ includeCount: 1, flags: { ...folder().flags, groups: true } }),
        'pinned',
      ),
    ).toBe(false)
  })
})

describe('wouldEmptyFolderByFlag', () => {
  it('blocks turning off the only active category flag on an otherwise-empty folder', () => {
    const f = folder({ flags: { ...folder().flags, contacts: true } })
    expect(wouldEmptyFolderByFlag(f, 'contacts', false)).toBe(true)
  })

  it('allows it when the folder still has explicit chats', () => {
    const f = folder({
      includeCount: 3,
      flags: { ...folder().flags, contacts: true },
    })
    expect(wouldEmptyFolderByFlag(f, 'contacts', false)).toBe(false)
  })

  it('allows it when another category flag is still on', () => {
    const f = folder({
      flags: { ...folder().flags, contacts: true, groups: true },
    })
    expect(wouldEmptyFolderByFlag(f, 'contacts', false)).toBe(false)
  })

  it('never blocks turning a flag on', () => {
    expect(wouldEmptyFolderByFlag(folder(), 'contacts', true)).toBe(false)
  })

  it('ignores exclude-rule flags (excludeMuted etc.) — they never populate a folder', () => {
    const f = folder({ flags: { ...folder().flags, excludeMuted: true } })
    expect(wouldEmptyFolderByFlag(f, 'excludeMuted', false)).toBe(false)
  })
})

describe('wouldEmptyFolderTo', () => {
  const lonely = folder({ includeCount: 1 })

  it('blocks jumping the last included chat straight to exclude or none', () => {
    expect(wouldEmptyFolderTo(lonely, 'include', 'exclude')).toBe(true)
    expect(wouldEmptyFolderTo(lonely, 'pinned', null)).toBe(true)
  })

  it('allows moves that keep it in the folder', () => {
    expect(wouldEmptyFolderTo(lonely, 'include', 'pinned')).toBe(false)
  })

  it('allows it when other chats remain', () => {
    expect(
      wouldEmptyFolderTo(folder({ includeCount: 2 }), 'include', 'exclude'),
    ).toBe(false)
  })
})
