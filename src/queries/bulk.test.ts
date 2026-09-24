import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { tl } from '@mtcute/web'
import { runBulkAction, toReport } from '#/queries/bulk'
import { dialogsQueryOptions } from '#/queries/dialogs'
import { foldersQueryOptions } from '#/queries/folders'
import { FIXTURE_CHATS, FIXTURE_FOLDERS } from '#/features/matrix/fixtures'
import type { Chat, Folder } from '#/telegram/types'

const telegram = vi.hoisted(() => ({
  setMuted: vi.fn(),
  markRead: vi.fn(),
  leaveChat: vi.fn(),
  deleteChat: vi.fn(),
  blockUser: vi.fn(),
  setArchivedMany: vi.fn(),
  setChatsRelation: vi.fn(),
}))

vi.mock('#/telegram/actions', () => telegram)
vi.mock('#/telegram/folders', () => ({
  setChatsRelation: telegram.setChatsRelation,
}))

let queryClient: QueryClient
const chats: Chat[] = FIXTURE_CHATS.slice(1, 4) // user, group, channel
const folder: Folder = FIXTURE_FOLDERS[0]

function cachedChats(): Chat[] {
  return queryClient.getQueryData(dialogsQueryOptions.queryKey) ?? []
}

const run = (
  action: Parameters<typeof runBulkAction>[1],
  signal?: AbortSignal,
) =>
  runBulkAction(queryClient, action, chats, {
    signal: signal ?? new AbortController().signal,
  })

beforeEach(() => {
  queryClient = new QueryClient()
  queryClient.setQueryData(dialogsQueryOptions.queryKey, FIXTURE_CHATS)
  queryClient.setQueryData(foldersQueryOptions.queryKey, FIXTURE_FOLDERS)
  for (const fn of Object.values(telegram)) {
    fn.mockReset().mockResolvedValue(undefined)
  }
})

afterEach(() => {
  vi.useRealTimers()
})

describe('runBulkAction', () => {
  it('patches only the chats that succeeded', async () => {
    telegram.setMuted.mockImplementation(async (peer: { id: number }) => {
      if (peer.id === chats[1].id) throw new tl.RpcError(400, 'PEER_ID_INVALID')
    })

    const result = await run({ type: 'mute' })

    expect(result.succeeded.map((c) => c.id)).toEqual([
      chats[0].id,
      chats[2].id,
    ])
    const muted = (id: number) =>
      cachedChats().find((c) => c.id === id)?.isMuted
    expect(muted(chats[0].id)).toBe(true)
    expect(muted(chats[1].id)).toBe(FIXTURE_CHATS[2].isMuted)
    expect(muted(chats[2].id)).toBe(true)
  })

  it('writes a folder change once for all chats and updates both caches', async () => {
    const updated: Folder = { ...folder, includeCount: 99 }
    telegram.setChatsRelation.mockResolvedValue(updated)

    await run({ type: 'folder', folder, relation: 'include' })

    expect(telegram.setChatsRelation).toHaveBeenCalledTimes(1)
    expect(telegram.setChatsRelation.mock.calls[0][1]).toHaveLength(3)
    const folders = queryClient.getQueryData(foldersQueryOptions.queryKey)
    expect(folders?.find((f) => f.id === folder.id)?.includeCount).toBe(99)
    for (const chat of chats) {
      expect(
        cachedChats().find((c) => c.id === chat.id)?.folders[folder.id],
      ).toBe('include')
    }
  })

  it('fails every chat together when the single folder write fails', async () => {
    telegram.setChatsRelation.mockRejectedValue(
      new tl.RpcError(400, 'FILTER_INCLUDE_TOO_MUCH'),
    )

    const result = await run({ type: 'folder', folder, relation: 'include' })

    expect(result.failed).toHaveLength(3)
    expect(cachedChats()).toEqual(FIXTURE_CHATS)
  })

  it('removes deleted chats from the list', async () => {
    await run({ type: 'delete' })
    const ids = cachedChats().map((c) => c.id)
    for (const chat of chats) expect(ids).not.toContain(chat.id)
  })

  it('leaves the rest untouched when cancelled', async () => {
    const controller = new AbortController()
    telegram.markRead.mockImplementation(async () => controller.abort())

    const result = await run({ type: 'markRead' }, controller.signal)

    expect(result.succeeded).toHaveLength(1)
    expect(result.cancelled).toHaveLength(2)
    expect(telegram.markRead).toHaveBeenCalledTimes(1)
  })

  it('waits out a long FLOOD_WAIT and carries on', async () => {
    vi.useFakeTimers()
    let calls = 0
    telegram.blockUser.mockImplementation(async () => {
      calls++
      if (calls === 1) {
        throw Object.assign(new tl.RpcError(420, 'FLOOD_WAIT_%d'), {
          seconds: 90,
        })
      }
    })

    const promise = run({ type: 'block' })
    await vi.advanceTimersByTimeAsync(90_000)
    const result = await promise

    expect(result.succeeded).toHaveLength(3)
    expect(result.failed).toHaveLength(0)
  })
})

describe('toReport', () => {
  it('groups failures by reason and keeps the raw code of unknown errors', () => {
    const report = toReport(
      {
        succeeded: [chats[0]],
        failed: [
          { item: chats[1], error: new tl.RpcError(400, 'WEIRD_ERROR') },
          { item: chats[2], error: new tl.RpcError(400, 'WEIRD_ERROR') },
        ],
        cancelled: [],
      },
      4,
    )

    expect(report.succeeded).toBe(1)
    expect(report.skipped).toBe(4)
    expect(report.failures).toHaveLength(1)
    expect(report.failures[0].reason).toContain('WEIRD_ERROR')
    expect(report.failures[0].chats).toHaveLength(2)
  })
})
