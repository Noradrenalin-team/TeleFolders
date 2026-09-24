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
  // A full re-list is a complete `iterDialogs` pass over the account (up to
  // 2000+ chats, ТЗ §6) — mutations patch this cache directly instead of
  // invalidating it (see queries/folders.ts, queries/actions.ts), so a long
  // staleTime here only affects the explicit "Обновить" button and window
  // refocus, not day-to-day interaction (ТЗ §2: "большой staleTime").
  staleTime: 10 * 60_000,
  refetchOnWindowFocus: false,
})

function chatPhotoQueryOptions(peer: PeerRef) {
  return queryOptions({
    queryKey: ['dialogs', 'photo', peer.kind, peer.id],
    // React Query rejects `undefined` as data; "no avatar" is a real,
    // cacheable answer, so it's stored as null.
    queryFn: async () => (await dialogs.getChatPhoto(peer)) ?? null,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  })
}

/** Fetches (and caches) a chat's avatar only once its row actually renders. */
export function useChatPhoto(peer: PeerRef, enabled = true) {
  return useQuery({ ...chatPhotoQueryOptions(peer), enabled })
}
