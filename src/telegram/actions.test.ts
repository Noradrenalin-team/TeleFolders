import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { tl } from '@mtcute/web'
import { deleteChat, leaveChat, mapBlocked } from '#/telegram/actions'

const calls: unknown[][] = []

const fakeClient = {
  deleteHistory: (...args: unknown[]) => {
    calls.push(['deleteHistory', ...args])
    return Promise.resolve()
  },
  blockUser: (...args: unknown[]) => {
    calls.push(['blockUser', ...args])
    return Promise.resolve()
  },
  leaveChat: (...args: unknown[]) => {
    calls.push(['leaveChat', ...args])
    return Promise.resolve()
  },
}

vi.mock('#/telegram/client', () => ({
  getClient: () => fakeClient,
}))

beforeEach(() => {
  calls.length = 0
})

describe('deleteChat (ТЗ §3 semantics)', () => {
  it('deletes a DM only for me by default', async () => {
    await deleteChat({ id: 1, kind: 'user' })
    expect(calls).toEqual([['deleteHistory', 1, { mode: 'delete' }]])
  })

  it('revokes a DM for both sides when asked', async () => {
    await deleteChat({ id: 1, kind: 'user' }, { revoke: true })
    expect(calls).toEqual([['deleteHistory', 1, { mode: 'revoke' }]])
  })

  it('never revokes for a bot, but blocks it first when asked', async () => {
    await deleteChat({ id: 2, kind: 'bot' }, { revoke: true, block: true })
    expect(calls).toEqual([
      ['blockUser', 2],
      ['deleteHistory', 2, { mode: 'delete' }],
    ])
  })

  it('only clears Saved Messages', async () => {
    await deleteChat({ id: 3, kind: 'saved' }, { revoke: true })
    expect(calls).toEqual([['deleteHistory', 3, { mode: 'clear' }]])
  })

  it('refuses to "delete" a group or channel', async () => {
    await expect(deleteChat({ id: -100, kind: 'channel' })).rejects.toThrow()
    expect(calls).toEqual([])
  })
})

describe('leaveChat', () => {
  it('clears history when leaving a legacy group', async () => {
    await leaveChat({ id: -5, kind: 'group' })
    expect(calls).toEqual([['leaveChat', -5, { clear: true }]])
  })

  it('just leaves a channel', async () => {
    await leaveChat({ id: -1005, kind: 'channel' })
    expect(calls).toEqual([['leaveChat', -1005, { clear: false }]])
  })

  it('refuses to leave a DM', async () => {
    await expect(leaveChat({ id: 1, kind: 'user' })).rejects.toThrow()
  })
})

describe('mapBlocked', () => {
  it('maps users, bots and channels to marked ids', () => {
    const page = {
      _: 'contacts.blocked',
      blocked: [
        { _: 'peerBlocked', peerId: { _: 'peerUser', userId: 10 }, date: 0 },
        { _: 'peerBlocked', peerId: { _: 'peerUser', userId: 11 }, date: 0 },
        {
          _: 'peerBlocked',
          peerId: { _: 'peerChannel', channelId: 12 },
          date: 0,
        },
      ],
      users: [
        {
          _: 'user',
          id: 10,
          firstName: 'Ann',
          lastName: 'Lee',
          username: 'ann',
        },
        { _: 'user', id: 11, firstName: 'Spam', bot: true },
      ],
      chats: [{ _: 'channel', id: 12, title: 'Ads', megagroup: false }],
    } as unknown as tl.contacts.TypeBlocked

    expect(mapBlocked(page)).toEqual([
      { id: 10, kind: 'user', title: 'Ann Lee', username: 'ann' },
      { id: 11, kind: 'bot', title: 'Spam', username: undefined },
      {
        id: -1000000000012,
        kind: 'channel',
        title: 'Ads',
        username: undefined,
      },
    ])
  })
})
