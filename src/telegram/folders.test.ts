import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Long } from '@mtcute/web'
import type { tl } from '@mtcute/web'
import {
  createFolder,
  reorderFolders,
  setChatRelation,
  setChatsRelation,
} from '#/telegram/folders'

function textWithEntities(text: string): tl.RawTextWithEntities {
  return { _: 'textWithEntities', text, entities: [] }
}

function inputUser(id: number): tl.TypeInputPeer {
  return { _: 'inputPeerUser', userId: id, accessHash: Long.ZERO }
}

/**
 * A minimal stand-in for mtcute's `TelegramClient`, just enough surface for
 * `telegram/folders.ts`. `getFolders`/`editFolder` share one mutable "server"
 * array so a test can tell a real read-modify-write cycle apart from one
 * built off a stale snapshot (ТЗ §3.1).
 */
function createFakeClient(initialFilters: tl.TypeDialogFilter[]) {
  let filters = initialFilters
  const calls: string[] = []
  const createdIds: number[] = []

  return {
    calls,
    createdIds,
    async getFolders() {
      calls.push('getFolders')
      return { filters }
    },
    async resolvePeer(id: number): Promise<tl.TypeInputPeer> {
      return inputUser(id)
    },
    async editFolder({
      folder,
      modification,
    }: {
      folder: tl.RawDialogFilter | number | string
      modification: Partial<tl.RawDialogFilter>
    }) {
      calls.push('editFolder')
      if (typeof folder === 'number' || typeof folder === 'string') {
        throw new Error('test fake only supports editing by object')
      }
      const updated: tl.RawDialogFilter = { ...folder, ...modification }
      filters = filters.map((f) =>
        f._ === 'dialogFilter' && f.id === updated.id ? updated : f,
      )
      return updated
    },
    async createFolder(
      params: Partial<tl.RawDialogFilter> & { title: tl.RawTextWithEntities },
    ) {
      calls.push('createFolder')
      const created: tl.RawDialogFilter = {
        _: 'dialogFilter',
        id: params.id ?? 2,
        pinnedPeers: [],
        includePeers: [],
        excludePeers: [],
        ...params,
      }
      createdIds.push(created.id)
      filters = [...filters, created]
      return created
    },
    async deleteFolder(id: number) {
      calls.push('deleteFolder')
      filters = filters.filter((f) => !('id' in f) || f.id !== id)
    },
    async setFoldersOrder(order: number[]) {
      calls.push(`setFoldersOrder:${order.join(',')}`)
    },
    storage: { self: { getCached: () => null as { userId: number } | null } },
  }
}

let fakeClient: ReturnType<typeof createFakeClient>

vi.mock('#/telegram/client', () => ({
  getClient: () => fakeClient,
}))

describe('setChatRelation', () => {
  beforeEach(() => {
    fakeClient = createFakeClient([
      {
        _: 'dialogFilter',
        id: 2,
        title: textWithEntities('Work'),
        pinnedPeers: [],
        includePeers: [],
        excludePeers: [inputUser(9)],
      },
    ])
  })

  it('serializes concurrent writes to the same folder (ТЗ §3.1)', async () => {
    // Fired without awaiting the first — if the queue didn't exist, both
    // would read the pre-write snapshot and one addition would be lost.
    const a = setChatRelation(2, { id: 1, kind: 'user' }, 'include')
    const b = setChatRelation(2, { id: 2, kind: 'user' }, 'include')
    const [, result] = await Promise.all([a, b])

    expect(result.includeCount).toBe(2)
  })

  it('moves a peer out of exclude when set to include', async () => {
    const result = await setChatRelation(2, { id: 9, kind: 'user' }, 'include')

    expect(result.excludeCount).toBe(0)
    expect(result.includeCount).toBe(1)
  })

  it('keeps pinned and include disjoint on the wire (ТЗ §3.3)', async () => {
    const result = await setChatRelation(2, { id: 1, kind: 'user' }, 'pinned')

    // includeCount counts the union, so a purely-pinned peer still counts
    // once — but it must not have been duplicated into includePeers too.
    expect(result.pinnedCount).toBe(1)
    expect(result.includeCount).toBe(1)
  })
})

describe('setChatsRelation (F6.5)', () => {
  beforeEach(() => {
    fakeClient = createFakeClient([
      {
        _: 'dialogFilter',
        id: 2,
        title: textWithEntities('Work'),
        pinnedPeers: [inputUser(5)],
        includePeers: [inputUser(6)],
        excludePeers: [inputUser(9)],
      },
    ])
  })

  it('adds many chats with a single filter write', async () => {
    const peers = [1, 2, 3, 9].map((id) => ({ id, kind: 'user' as const }))
    const result = await setChatsRelation(2, peers, 'include')

    expect(fakeClient.calls.filter((c) => c === 'editFolder')).toHaveLength(1)
    expect(result.includeCount).toBe(6) // 5 (pinned) + 6 + 1, 2, 3, 9
    expect(result.excludeCount).toBe(0)
  })

  it('clears many chats at once, leaving the rest alone', async () => {
    const peers = [5, 9].map((id) => ({ id, kind: 'user' as const }))
    const result = await setChatsRelation(2, peers, null)

    expect(result.pinnedCount).toBe(0)
    expect(result.excludeCount).toBe(0)
    expect(result.includeCount).toBe(1)
  })
})

describe('createFolder', () => {
  it('picks a new id past every non-default filter, including chatlists', async () => {
    fakeClient = createFakeClient([
      { _: 'dialogFilterDefault' },
      {
        _: 'dialogFilterChatlist',
        id: 2,
        title: textWithEntities('Shared'),
        pinnedPeers: [],
        includePeers: [],
      },
    ])

    await createFolder('New', [{ id: 1, kind: 'user' }])

    // The chatlist already occupies id 2 — mtcute's own id-picker only
    // looks at `dialogFilter` entries and would have collided with it.
    expect(fakeClient.createdIds).toEqual([3])
  })
})

describe('reorderFolders', () => {
  it("keeps the default folder (id 0) pinned first, even if it isn't in the requested order", async () => {
    fakeClient = createFakeClient([
      { _: 'dialogFilterDefault' },
      {
        _: 'dialogFilter',
        id: 2,
        title: textWithEntities('A'),
        pinnedPeers: [],
        includePeers: [],
        excludePeers: [],
      },
      {
        _: 'dialogFilter',
        id: 3,
        title: textWithEntities('B'),
        pinnedPeers: [],
        includePeers: [],
        excludePeers: [],
      },
    ])

    await reorderFolders([3, 2])

    expect(fakeClient.calls).toContain('setFoldersOrder:0,3,2')
  })
})
