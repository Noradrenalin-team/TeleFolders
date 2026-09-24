import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MutationObserver, QueryClient } from '@tanstack/react-query'
import type { MutationObserverOptions } from '@tanstack/react-query'
import { tl } from '@mtcute/web'
import { dialogsQueryOptions } from '#/queries/dialogs'
import {
  foldersQueryOptions,
  setChatRelationMutation,
  setFolderFlagMutation,
} from '#/queries/folders'
import { deleteChatMutation, setArchivedMutation } from '#/queries/actions'
import { FIXTURE_CHATS, FIXTURE_FOLDERS } from '#/features/matrix/fixtures'
import { m } from '#/paraglide/messages'
import type { Chat, Folder } from '#/telegram/types'

const telegram = vi.hoisted(() => ({
  setChatRelation: vi.fn(),
  setFolderFlag: vi.fn(),
  setArchived: vi.fn(),
  deleteChat: vi.fn(),
}))
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))

vi.mock('#/telegram/folders', () => ({
  setChatRelation: telegram.setChatRelation,
  setFolderFlag: telegram.setFolderFlag,
}))
vi.mock('#/telegram/actions', () => ({
  setArchived: telegram.setArchived,
  deleteChat: telegram.deleteChat,
}))
vi.mock('sonner', () => ({ toast }))

let queryClient: QueryClient

function deferred<T = void>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function mutate<TData, TError, TVars, TContext>(
  options: MutationObserverOptions<TData, TError, TVars, TContext>,
  vars: TVars,
) {
  const observer = new MutationObserver(queryClient, options)
  return observer.mutate(vars).catch((error: unknown) => error)
}

const chatById = (id: number): Chat | undefined =>
  queryClient
    .getQueryData(dialogsQueryOptions.queryKey)
    ?.find((chat) => chat.id === id)
const folderById = (id: number): Folder | undefined =>
  queryClient
    .getQueryData(foldersQueryOptions.queryKey)
    ?.find((folder) => folder.id === id)

// FIXTURE_CHATS[1] ("Команда") is pinned in folder 2, FIXTURE_CHATS[3]
// ("Новости TanStack") is in folders 3 and 4 — a chat in several folders.
const team = FIXTURE_CHATS[1]
const news = FIXTURE_CHATS[3]
const work = FIXTURE_FOLDERS[0]

beforeEach(() => {
  queryClient = new QueryClient()
  queryClient.setQueryData(dialogsQueryOptions.queryKey, FIXTURE_CHATS)
  queryClient.setQueryData(foldersQueryOptions.queryKey, FIXTURE_FOLDERS)
  for (const fn of [...Object.values(telegram), ...Object.values(toast)]) {
    fn.mockReset()
  }
})

describe('setChatRelation (F2.6)', () => {
  it('applies the change before the server answers', async () => {
    const server = deferred<Folder>()
    telegram.setChatRelation.mockReturnValue(server.promise)

    const done = mutate(setChatRelationMutation(queryClient), {
      folderId: work.id,
      peer: { id: news.id, kind: news.kind },
      relation: 'exclude',
    })
    await vi.waitFor(() =>
      expect(chatById(news.id)?.folders[work.id]).toBe('exclude'),
    )

    server.resolve({ ...work, excludeCount: 42 })
    await done
    // The folder the server returned replaces the cached one.
    expect(folderById(work.id)?.excludeCount).toBe(42)
  })

  it('puts the cell back and says why when the write fails', async () => {
    telegram.setChatRelation.mockRejectedValue(
      new tl.RpcError(400, 'FILTER_INCLUDE_EMPTY'),
    )
    const before = { chat: chatById(team.id), folder: folderById(work.id) }

    await mutate(setChatRelationMutation(queryClient), {
      folderId: work.id,
      peer: { id: team.id, kind: team.kind },
      relation: null,
    })

    expect(chatById(team.id)).toEqual(before.chat)
    expect(folderById(work.id)).toEqual(before.folder)
    expect(toast.error).toHaveBeenCalledWith(m.error_folder_empty())
  })

  it("rolls back only its own change, not a concurrent one's", async () => {
    const first = deferred<Folder>()
    telegram.setChatRelation
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(work)

    const failing = mutate(setChatRelationMutation(queryClient), {
      folderId: work.id,
      peer: { id: team.id, kind: team.kind },
      relation: 'exclude',
    })
    await mutate(setChatRelationMutation(queryClient), {
      folderId: 3,
      peer: { id: news.id, kind: news.kind },
      relation: null,
    })
    first.reject(new tl.RpcError(400, 'PEER_ID_INVALID'))
    await failing

    expect(chatById(team.id)?.folders[work.id]).toBe(team.folders[work.id])
    expect(chatById(news.id)?.folders[3]).toBeUndefined()
  })
})

describe('setFolderFlag', () => {
  it('reverts the flag on error', async () => {
    telegram.setFolderFlag.mockRejectedValue(new Error('network down'))
    const before = folderById(work.id)?.flags.groups

    await mutate(setFolderFlagMutation(queryClient), {
      folderId: work.id,
      flag: 'groups',
      value: !before,
    })

    expect(folderById(work.id)?.flags.groups).toBe(before)
    expect(toast.error).toHaveBeenCalled()
  })
})

describe('setArchived', () => {
  it('reverts the archive toggle on error', async () => {
    telegram.setArchived.mockRejectedValue(new Error('boom'))

    await mutate(setArchivedMutation(queryClient), {
      peer: { id: team.id, kind: team.kind },
      archived: true,
    })

    expect(chatById(team.id)?.isArchived).toBe(false)
  })
})

describe('deleteChat (F5.3, F5.7)', () => {
  it('drops the chat only once the server confirms', async () => {
    const server = deferred()
    telegram.deleteChat.mockReturnValue(server.promise)

    const done = mutate(deleteChatMutation(queryClient), { chat: team })
    await vi.waitFor(() => expect(telegram.deleteChat).toHaveBeenCalled())
    expect(chatById(team.id)).toBeDefined()

    server.resolve()
    await done
    expect(chatById(team.id)).toBeUndefined()
    expect(toast.success).toHaveBeenCalled()
  })

  it('keeps the chat and reports the error when deletion fails', async () => {
    telegram.deleteChat.mockRejectedValue(new tl.RpcError(400, 'USER_CREATOR'))

    await mutate(deleteChatMutation(queryClient), { chat: team })

    expect(chatById(team.id)).toBeDefined()
    expect(toast.error).toHaveBeenCalledWith(m.error_owner_cannot_leave())
  })
})
