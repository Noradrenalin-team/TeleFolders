import { getClient } from '#/telegram/client'
import { mapDialogToChat } from '#/telegram/mappers'
import type { Chat, PeerRef } from '#/telegram/types'

/** Main list + archive, in one flat pass (F2.1). Reports progress as chats arrive. */
export async function listDialogs(
  onProgress?: (loadedCount: number) => void,
): Promise<Chat[]> {
  const client = getClient()
  const { filters } = await client.getFolders()

  const chats: Chat[] = []
  for await (const dialog of client.iterDialogs({
    archived: 'keep',
    pinned: 'include',
  })) {
    chats.push(mapDialogToChat(dialog, filters))
    onProgress?.(chats.length)
  }

  return chats
}

const photoCache = new Map<string, Promise<string | undefined>>()

/** Lazy, cached avatar download — never fetched eagerly for the whole list (F2). */
export function getChatPhoto(peer: PeerRef): Promise<string | undefined> {
  const key = `${peer.kind}:${peer.id}`
  let cached = photoCache.get(key)

  if (!cached) {
    cached = fetchChatPhoto(peer)
    photoCache.set(key, cached)
  }

  return cached
}

async function fetchChatPhoto(peer: PeerRef): Promise<string | undefined> {
  const client = getClient()
  const isUserLike =
    peer.kind === 'user' || peer.kind === 'bot' || peer.kind === 'saved'
  const entity = isUserLike
    ? await client.getUser(peer.id)
    : await client.getChat(peer.id)

  if (!entity.photo) return undefined

  const bytes = await client.downloadAsBuffer(entity.photo.small)
  return URL.createObjectURL(new Blob([bytes.slice()], { type: 'image/jpeg' }))
}
