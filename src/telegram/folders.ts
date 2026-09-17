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
  const raw = await getClient().getFolders()

  return raw.filters
    .filter((f) => f._ !== 'dialogFilterDefault')
    .map(mapFilterToFolder)
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
      const updated = await getClient().editFolder({
        folder: folderId,
        modification: { [flag]: value },
      })
      return mapFilterToFolder(updated)
    }),
  )
}

/**
 * Sets a chat's relation to a folder (include/pinned/exclude), or clears it
 * (`null`). Always read-modify-write against a freshly fetched filter,
 * serialized per folder — never built from the UI's cached copy (ТЗ §3.1).
 *
 * `pinned` implies `include` (ТЗ §3.3): a pinned peer is also added to
 * `includePeers`, matching what the official clients do.
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
      const key = peerKey(inputPeer)

      const pinnedPeers = current.pinnedPeers.filter((p) => peerKey(p) !== key)
      const includePeers = current.includePeers.filter(
        (p) => peerKey(p) !== key,
      )
      const excludePeers = current.excludePeers.filter(
        (p) => peerKey(p) !== key,
      )

      if (relation === 'pinned') {
        pinnedPeers.push(inputPeer)
        includePeers.push(inputPeer)
      } else if (relation === 'include') {
        includePeers.push(inputPeer)
      } else if (relation === 'exclude') {
        excludePeers.push(inputPeer)
      }

      const updated = await client.editFolder({
        folder: current,
        modification: { pinnedPeers, includePeers, excludePeers },
      })
      return mapFilterToFolder(updated)
    }),
  )
}

export async function createFolder(
  title: string,
  emoticon?: string,
): Promise<Folder> {
  return withFloodWaitRetry(async () => {
    const created = await getClient().createFolder({
      title: { _: 'textWithEntities', text: title, entities: [] },
      emoticon,
    })
    return mapFilterToFolder(created)
  })
}

export async function renameFolder(
  folderId: number,
  title: string,
  emoticon?: string,
): Promise<Folder> {
  return enqueueFolderWrite(folderId, () =>
    withFloodWaitRetry(async () => {
      const updated = await getClient().editFolder({
        folder: folderId,
        modification: {
          title: { _: 'textWithEntities', text: title, entities: [] },
          emoticon,
        },
      })
      return mapFilterToFolder(updated)
    }),
  )
}

export async function deleteFolder(folderId: number): Promise<void> {
  return enqueueFolderWrite(folderId, () =>
    withFloodWaitRetry(() => getClient().deleteFolder(folderId)),
  )
}

export async function reorderFolders(ids: number[]): Promise<void> {
  return withFloodWaitRetry(() => getClient().setFoldersOrder(ids))
}
