import { queryOptions, useQuery } from '@tanstack/react-query'
import { Store } from '@tanstack/store'
import * as dialogs from '#/telegram/dialogs'
import type { PeerRef } from '#/telegram/types'

/** Chats loaded so far, for the "loaded N chats" progress indicator (F2.10). */
export const dialogsLoadProgress = new Store(0)

export const dialogsQueryOptions = queryOptions({
  queryKey: ['dialogs'],
  queryFn: () => {
    dialogsLoadProgress.setState(() => 0)
    return dialogs.listDialogs((loadedCount) =>
      dialogsLoadProgress.setState(() => loadedCount),
    )
  },
  staleTime: 60_000,
})

function chatPhotoQueryOptions(peer: PeerRef) {
  return queryOptions({
    queryKey: ['dialogs', 'photo', peer.kind, peer.id],
    queryFn: () => dialogs.getChatPhoto(peer),
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

/** Fetches (and caches) a chat's avatar only once its row actually renders. */
export function useChatPhoto(peer: PeerRef) {
  return useQuery(chatPhotoQueryOptions(peer))
}
