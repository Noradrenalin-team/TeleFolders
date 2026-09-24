import { describe, expect, it } from 'vitest'
import {
  chatActionsFor,
  telegramLink,
} from '#/features/chat-actions/chat-actions'
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
    isOwner: false,
    folders: {},
    ...overrides,
  }
}

describe('chatActionsFor', () => {
  it('offers delete and block for a DM', () => {
    expect(chatActionsFor(chat()).destructive).toEqual(['delete', 'block'])
  })

  it('offers only leave for a group or channel', () => {
    const group = chat({
      kind: 'group',
      canDelete: false,
      canLeave: true,
      canBlock: false,
    })
    expect(chatActionsFor(group).destructive).toEqual(['leave'])
  })

  it('does not offer leaving a channel I own (Telegram refuses it)', () => {
    const owned = chat({
      kind: 'channel',
      canDelete: false,
      canLeave: true,
      canBlock: false,
      isOwner: true,
    })
    expect(chatActionsFor(owned).destructive).toEqual([])
  })

  it('does not offer leaving a supergroup I own either', () => {
    const owned = chat({
      kind: 'supergroup',
      canDelete: false,
      canLeave: true,
      canBlock: false,
      isOwner: true,
    })
    expect(chatActionsFor(owned).destructive).toEqual([])
  })

  it('still offers leaving a legacy group I own', () => {
    const owned = chat({
      kind: 'group',
      canDelete: false,
      canLeave: true,
      canBlock: false,
      isOwner: true,
    })
    expect(chatActionsFor(owned).destructive).toEqual(['leave'])
  })

  it('offers only clearing history for Saved Messages', () => {
    const saved = chat({ kind: 'saved', isSelf: true, canBlock: false })
    expect(chatActionsFor(saved).destructive).toEqual(['clearHistory'])
  })

  it('flips safe toggles by current state', () => {
    const { safe } = chatActionsFor(
      chat({ isPinned: true, isArchived: true, isMuted: true, unreadCount: 3 }),
    )
    expect(safe).toEqual([
      'unpin',
      'unarchive',
      'unmute',
      'markRead',
      'openInTelegram',
    ])
  })

  it('swaps block for unblock when the user is blocked', () => {
    const actions = chatActionsFor(chat(), { isBlocked: true })
    expect(actions.safe).toContain('unblock')
    expect(actions.destructive).toEqual(['delete'])
  })

  it('hides markRead when nothing is unread', () => {
    expect(chatActionsFor(chat()).safe).not.toContain('markRead')
  })
})

describe('telegramLink', () => {
  it('prefers the public username', () => {
    expect(telegramLink({ kind: 'channel', username: 'news', peerId: 5 })).toBe(
      'https://t.me/news',
    )
  })

  it('falls back to a user id link for users', () => {
    expect(telegramLink({ kind: 'user', peerId: 42 })).toBe('tg://user?id=42')
  })

  it('has no link for a private group', () => {
    expect(telegramLink({ kind: 'supergroup', peerId: 7 })).toBeUndefined()
  })
})
