import { describe, expect, it } from 'vitest'
import {
  appliesTo,
  bulkWouldEmptyFolder,
  isDestructiveBulk,
} from '#/features/bulk/bulk-actions'
import { FIXTURE_FOLDERS } from '#/features/matrix/fixtures'
import type { Chat, Folder } from '#/telegram/types'

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
    isOwner: false,
    folders: {},
    ...overrides,
  }
}

const folder: Folder = {
  ...FIXTURE_FOLDERS[0],
  id: 7,
  includeCount: 2,
  readOnly: false,
  flags: {
    ...FIXTURE_FOLDERS[0].flags,
    contacts: false,
    nonContacts: false,
    groups: false,
    broadcasts: false,
    bots: false,
  },
}

describe('appliesTo', () => {
  it('skips chats already in the target state', () => {
    expect(appliesTo({ type: 'mute' }, chat({ isMuted: true }))).toBe(false)
    expect(appliesTo({ type: 'markRead' }, chat())).toBe(false)
    expect(
      appliesTo(
        { type: 'folder', folder, relation: 'include' },
        chat({ folders: { 7: 'pinned' } }),
      ),
    ).toBe(false)
  })

  it('never leaves a DM or deletes Saved Messages', () => {
    expect(appliesTo({ type: 'leave' }, chat())).toBe(false)
    expect(
      appliesTo({ type: 'delete' }, chat({ kind: 'saved', isSelf: true })),
    ).toBe(false)
  })

  it('does not block someone already blocked', () => {
    expect(appliesTo({ type: 'block' }, chat(), { isBlocked: true })).toBe(
      false,
    )
  })

  it('leaves read-only folders alone', () => {
    expect(
      appliesTo(
        {
          type: 'folder',
          folder: { ...folder, readOnly: true },
          relation: 'include',
        },
        chat(),
      ),
    ).toBe(false)
  })
})

describe('bulkWouldEmptyFolder', () => {
  const a = chat({ id: 1, folders: { 7: 'include' } })
  const b = chat({ id: 2, folders: { 7: 'pinned' } })

  it('catches removing every included chat', () => {
    expect(
      bulkWouldEmptyFolder({ type: 'folder', folder, relation: null }, [a, b]),
    ).toBe(true)
  })

  it('allows removing some of them', () => {
    expect(
      bulkWouldEmptyFolder({ type: 'folder', folder, relation: 'exclude' }, [
        a,
      ]),
    ).toBe(false)
  })

  it('trusts a category flag to keep the folder non-empty', () => {
    const flagged = { ...folder, flags: { ...folder.flags, groups: true } }
    expect(
      bulkWouldEmptyFolder(
        { type: 'folder', folder: flagged, relation: null },
        [a, b],
      ),
    ).toBe(false)
  })
})

describe('isDestructiveBulk', () => {
  it('flags only irreversible actions', () => {
    expect(isDestructiveBulk({ type: 'delete' })).toBe(true)
    expect(isDestructiveBulk({ type: 'archive' })).toBe(false)
  })
})
