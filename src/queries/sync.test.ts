import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { applyChanges, refreshFoldersNow } from '#/queries/sync'
import { dialogsQueryOptions } from '#/queries/dialogs'
import { foldersQueryOptions } from '#/queries/folders'
import { FIXTURE_CHATS, FIXTURE_FOLDERS } from '#/features/matrix/fixtures'
import type { Chat } from '#/telegram/types'

const telegram = vi.hoisted(() => ({
  refreshChatFolders: vi.fn(),
  listFolders: vi.fn(),
}))
vi.mock('#/telegram/updates', () => ({
  refreshChatFolders: telegram.refreshChatFolders,
}))
vi.mock('#/telegram/folders', () => ({ listFolders: telegram.listFolders }))

let queryClient: QueryClient
const chat = (id: number) =>
  queryClient
    .getQueryData(dialogsQueryOptions.queryKey)
    ?.find((c) => c.id === id)

beforeEach(() => {
  queryClient = new QueryClient()
  queryClient.setQueryData(dialogsQueryOptions.queryKey, FIXTURE_CHATS)
  telegram.refreshChatFolders.mockReset()
  telegram.listFolders.mockReset()
})

describe('applyChanges', () => {
  it('patches chats and bumps unread counts in place', () => {
    const [a, b] = FIXTURE_CHATS
    const refreshFolders = vi.fn()
    applyChanges(
      queryClient,
      [
        { kind: 'chat', id: a.id, patch: { isArchived: true } },
        { kind: 'unread+1', id: b.id },
      ],
      refreshFolders,
    )
    expect(chat(a.id)?.isArchived).toBe(true)
    expect(chat(b.id)?.unreadCount).toBe(b.unreadCount + 1)
    expect(refreshFolders).not.toHaveBeenCalled()
  })

  it('hands folder changes to the (debounced) refresh', () => {
    const refreshFolders = vi.fn()
    applyChanges(queryClient, [{ kind: 'folders' }], refreshFolders)
    expect(refreshFolders).toHaveBeenCalledOnce()
  })
})

describe('refreshFoldersNow', () => {
  it('drops a folder deleted elsewhere from the columns and from every chat', async () => {
    const [deleted, ...rest] = FIXTURE_FOLDERS
    telegram.listFolders.mockResolvedValue(rest)
    queryClient.setQueryData(foldersQueryOptions.queryKey, FIXTURE_FOLDERS)
    // Keep the folders query "active" so invalidation refetches it.
    const unobserve = new QueryObserver(
      queryClient,
      foldersQueryOptions,
    ).subscribe(() => undefined)
    telegram.refreshChatFolders.mockImplementation(async (chats: Chat[]) =>
      chats.map((c) => {
        const folders = { ...c.folders }
        delete folders[deleted.id]
        return { ...c, folders }
      }),
    )

    await refreshFoldersNow(queryClient)

    expect(
      queryClient.getQueryData(foldersQueryOptions.queryKey)?.map((f) => f.id),
    ).toEqual(rest.map((f) => f.id))
    for (const c of queryClient.getQueryData(dialogsQueryOptions.queryKey) ??
      []) {
      expect(c.folders[deleted.id]).toBeUndefined()
    }
    unobserve()
  })
})
