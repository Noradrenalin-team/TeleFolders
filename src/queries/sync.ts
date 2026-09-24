import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import * as updates from '#/telegram/updates'
import type { ChatChange, ConnectionState } from '#/telegram/updates'
import { dialogsQueryOptions } from '#/queries/dialogs'
import { foldersQueryOptions } from '#/queries/folders'
import { patchChat } from '#/queries/actions'

const FOLDER_REFRESH_DEBOUNCE_MS = 300

/** Applies one batch of incoming changes to the cache; folder changes are
 * handed to `refreshFolders`, which is debounced by the caller. */
export function applyChanges(
  queryClient: QueryClient,
  changes: ChatChange[],
  refreshFolders: () => void,
): void {
  for (const change of changes) {
    if (change.kind === 'folders') {
      refreshFolders()
    } else if (change.kind === 'chat') {
      patchChat(queryClient, change.id, change.patch)
    } else {
      queryClient.setQueryData(dialogsQueryOptions.queryKey, (chats) =>
        chats?.map((chat) =>
          chat.id === change.id
            ? { ...chat, unreadCount: chat.unreadCount + 1 }
            : chat,
        ),
      )
    }
  }
}

/**
 * Re-reads folders and every chat's relation to them after a change made
 * in another client. Waits while any mutation of ours is in flight: its
 * optimistic state isn't on the server yet, and a refresh landing now
 * would briefly (or, for the chat side, permanently) revert it.
 */
export async function refreshFoldersNow(queryClient: QueryClient) {
  await queryClient.invalidateQueries({
    queryKey: foldersQueryOptions.queryKey,
  })
  const chats = queryClient.getQueryData(dialogsQueryOptions.queryKey)
  if (!chats) return
  const refreshed = await updates.refreshChatFolders(chats)
  const relations = new Map(refreshed.map((chat) => [chat.id, chat.folders]))
  queryClient.setQueryData(dialogsQueryOptions.queryKey, (current) =>
    current?.map((chat) => {
      const folders = relations.get(chat.id)
      return folders ? { ...chat, folders } : chat
    }),
  )
}

/**
 * Keeps the cache in step with changes made elsewhere — the official app,
 * another device (ТЗ §2). Mounted once while signed in.
 */
export function useTelegramSync(enabled: boolean) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let unsubscribe: (() => void) | undefined
    let timer: ReturnType<typeof setTimeout> | undefined

    const scheduleFolderRefresh = () => {
      clearTimeout(timer)
      timer = setTimeout(function run() {
        if (queryClient.isMutating() > 0) {
          timer = setTimeout(run, FOLDER_REFRESH_DEBOUNCE_MS)
          return
        }
        void refreshFoldersNow(queryClient)
      }, FOLDER_REFRESH_DEBOUNCE_MS)
    }

    void updates
      .subscribeToChanges((changes) =>
        applyChanges(queryClient, changes, scheduleFolderRefresh),
      )
      .then((stop) => {
        if (cancelled) stop()
        else unsubscribe = stop
      })

    return () => {
      cancelled = true
      clearTimeout(timer)
      unsubscribe?.()
    }
  }, [enabled, queryClient])
}

/** How long a (re)connect may take before the banner shows — a normal
 * connect is well under this and shouldn't flash anything. */
const BANNER_DELAY_MS = 2000

/** F9.2: true while the connection to Telegram is lost and being restored. */
export function useConnectionLost(enabled: boolean): boolean {
  const [lost, setLost] = useState(false)

  useEffect(() => {
    if (!enabled) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const onState = (state: ConnectionState) => {
      clearTimeout(timer)
      if (state === 'connected' || state === 'updating') {
        setLost(false)
      } else {
        timer = setTimeout(() => setLost(true), BANNER_DELAY_MS)
      }
    }
    const onOffline = () => onState('offline')
    const onOnline = () => onState('connecting')

    const unsubscribe = updates.subscribeConnectionState(onState)
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    if (!navigator.onLine) onState('offline')

    return () => {
      clearTimeout(timer)
      unsubscribe()
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
      setLost(false)
    }
  }, [enabled])

  return lost
}
