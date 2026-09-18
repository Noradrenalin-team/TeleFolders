import { getClient } from '#/telegram/client'
import { withFloodWaitRetry } from '#/telegram/errors'
import { mapFilterToFolder, peerKey } from '#/telegram/mappers'
import type {
  ChatFolderRelation,
  Folder,
  FolderFlag,
  PeerRef,
} from '#/telegram/types'

export async function listFolders(): Promise<Folder[]> {
  const client = getClient()
  const raw = await client.getFolders()
  const selfId = client.storage.self.getCached()?.userId

  return raw.filters
    .filter((f) => f._ !== 'dialogFilterDefault')
    .map((f) => mapFilterToFolder(f, selfId))
}

// Serializes writes per folder id (ТЗ §3: "не более одной записи в один
// фильтр одновременно, иначе изменения теряются"). Each queued task always
// runs, even if the previous one failed — only the caller's own promise
// carries that failure.
const writeQueues = new Map<number, Promise<unknown>>()

function enqueueFolderWrite<T>(
  folderId: number,
  task: () => Promise<T>,
): Promise<T> {
  const tail = writeQueues.get(folderId) ?? Promise.resolve()
  const result = tail.then(task, task)
  writeQueues.set(
    folderId,
    result.catch(() => undefined),
  )
  return result
}

export async function setFolderFlag(
  folderId: number,
  flag: FolderFlag,
  value: boolean,
): Promise<Folder> {
  return enqueueFolderWrite(folderId, () =>
    withFloodWaitRetry(async () => {
      const client = getClient()
      const updated = await client.editFolder({
        folder: folderId,
        modification: { [flag]: value },
      })
      return mapFilterToFolder(updated, client.storage.self.getCached()?.userId)
    }),
  )
}

/**
 * Sets a chat's relation to a folder (include/pinned/exclude), or clears it
 * (`null`). Always read-modify-write against a freshly fetched filter,
 * serialized per folder — never built from the UI's cached copy (ТЗ §3.1).
 *
 * `pinned` implies `include` in how it's *displayed* (ТЗ §3.3: a pinned peer
 * is reported as `pinned`, not `include`+`pinned`), but on the wire the two
 * lists are kept disjoint — a peer lives in exactly one of `pinnedPeers`,
 * `includePeers`, `excludePeers`, matching what the official clients store.
 */
export async function setChatRelation(
  folderId: number,
  peer: PeerRef,
  relation: ChatFolderRelation | null,
): Promise<Folder> {
  return enqueueFolderWrite(folderId, () =>
    withFloodWaitRetry(async () => {
      const client = getClient()
      const { filters } = await client.getFolders()
      const current = filters.find(
        (f) => f._ === 'dialogFilter' && f.id === folderId,
      )

      if (!current || current._ !== 'dialogFilter') {
        throw new Error(`Folder ${folderId} not found or not editable`)
      }

      const inputPeer = await client.resolvePeer(peer.id)
      const selfId = client.storage.self.getCached()?.userId
      const key = peerKey(inputPeer, selfId)

      const pinnedPeers = current.pinnedPeers.filter(
        (p) => peerKey(p, selfId) !== key,
      )
      const includePeers = current.includePeers.filter(
        (p) => peerKey(p, selfId) !== key,
      )
      const excludePeers = current.excludePeers.filter(
        (p) => peerKey(p, selfId) !== key,
      )

      if (relation === 'pinned') {
        pinnedPeers.push(inputPeer)
      } else if (relation === 'include') {
        includePeers.push(inputPeer)
      } else if (relation === 'exclude') {
        excludePeers.push(inputPeer)
      }

      const updated = await client.editFolder({
        folder: current,
        modification: { pinnedPeers, includePeers, excludePeers },
      })
      return mapFilterToFolder(updated, selfId)
    }),
  )
}

/**
 * Creates a folder with an initial set of chats (F4.1). Telegram rejects an
 * empty folder (`FILTER_INCLUDE_EMPTY`) unless at least one category flag is
 * set, so a brand-new folder needs its `includePeers` filled in up front —
 * it can't be created empty and populated afterwards through the matrix.
 */
export async function createFolder(
  title: string,
  includePeers: ReadonlyArray<PeerRef>,
  emoticon?: string,
): Promise<Folder> {
  return withFloodWaitRetry(async () => {
    const client = getClient()
    const { filters } = await client.getFolders()

    // mtcute's own `createFolder()` only scans `dialogFilter` entries when
    // picking the next free id — a shared chatlist (`dialogFilterChatlist`)
    // can already occupy that id, and Telegram then rejects the write. Scan
    // every non-default filter instead (ТЗ §3.1).
    let maxId = 1
    for (const filter of filters) {
      if (filter._ !== 'dialogFilterDefault' && filter.id > maxId) {
        maxId = filter.id
      }
    }

    const resolvedIncludePeers = await Promise.all(
      includePeers.map((peer) => client.resolvePeer(peer.id)),
    )

    const created = await client.createFolder({
      id: maxId + 1,
      title: { _: 'textWithEntities', text: title, entities: [] },
      emoticon,
      includePeers: resolvedIncludePeers,
    })
    return mapFilterToFolder(created, client.storage.self.getCached()?.userId)
  })
}

export async function renameFolder(
  folderId: number,
  title: string,
  emoticon?: string,
): Promise<Folder> {
  return enqueueFolderWrite(folderId, () =>
    withFloodWaitRetry(async () => {
      const client = getClient()
      const updated = await client.editFolder({
        folder: folderId,
        modification: {
          title: { _: 'textWithEntities', text: title, entities: [] },
          emoticon,
        },
      })
      return mapFilterToFolder(updated, client.storage.self.getCached()?.userId)
    }),
  )
}

export async function deleteFolder(folderId: number): Promise<void> {
  return enqueueFolderWrite(folderId, () =>
    withFloodWaitRetry(() => getClient().deleteFolder(folderId)),
  )
}

export async function reorderFolders(ids: number[]): Promise<void> {
  return withFloodWaitRetry(async () => {
    const client = getClient()
    const { filters } = await client.getFolders()
    const hasDefault = filters.some((f) => f._ === 'dialogFilterDefault')
    // `messages.updateDialogFiltersOrder` expects every filter, including
    // the default "all chats" folder (id 0) — omitting it can bump it out of
    // first place for accounts that show it as a real tab (F4.4).
    const order = hasDefault ? [0, ...ids.filter((id) => id !== 0)] : ids
    await client.setFoldersOrder(order)
  })
}
