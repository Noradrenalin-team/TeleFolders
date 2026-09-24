import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import * as actions from '#/telegram/actions'
import * as folders from '#/telegram/folders'
import { normalizeError, subscribeFloodWait } from '#/telegram/errors'
import { errorMessage } from '#/telegram/error-message'
import type { Chat, PeerRef } from '#/telegram/types'
import { runQueue } from '#/features/bulk/run-queue'
import type { QueueProgress, QueueResult } from '#/features/bulk/run-queue'
import type { BulkAction } from '#/features/bulk/bulk-actions'
import { dialogsQueryOptions } from '#/queries/dialogs'
import { foldersQueryOptions } from '#/queries/folders'
import { blockedQueryOptions, patchChat, removeChat } from '#/queries/actions'

export type BulkReport = {
  succeeded: number
  cancelled: number
  /** Selected, but the action didn't apply to them (see `appliesTo`). */
  skipped: number
  /** Failures grouped by their user-facing reason. */
  failures: { reason: string; chats: Chat[] }[]
}

export type BulkRunState =
  | { status: 'idle' }
  | {
      status: 'running'
      action: BulkAction
      done: number
      total: number
      waitingSec?: number
      cancelling: boolean
    }
  | { status: 'done'; action: BulkAction; report: BulkReport }

const peerOf = (chat: Chat): PeerRef => ({ id: chat.id, kind: chat.kind })

/** F6.3 "и почему": a generic "something went wrong" alone isn't a reason,
 * so an unrecognized error keeps its raw RPC code next to it. */
function failureReason(error: unknown): string {
  const normalized = normalizeError(error)
  const message = errorMessage(error)
  return normalized.code === 'UNKNOWN'
    ? `${message} (${normalized.raw})`
    : message
}

export function toReport(
  result: QueueResult<Chat>,
  skipped: number,
): BulkReport {
  const byReason = new Map<string, Chat[]>()
  for (const { item, error } of result.failed) {
    const reason = failureReason(error)
    byReason.set(reason, [...(byReason.get(reason) ?? []), item])
  }
  return {
    succeeded: result.succeeded.length,
    cancelled: result.cancelled.length,
    skipped,
    failures: [...byReason].map(([reason, chats]) => ({ reason, chats })),
  }
}

async function allOrNothing(
  chats: Chat[],
  request: () => Promise<void>,
): Promise<QueueResult<Chat>> {
  try {
    await request()
    return { succeeded: chats, failed: [], cancelled: [] }
  } catch (error) {
    return {
      succeeded: [],
      failed: chats.map((item) => ({ item, error })),
      cancelled: [],
    }
  }
}

/**
 * Runs one F6 bulk action over `chats` and keeps the Query cache in step.
 * Folder changes and archiving go out as a single request (F6.5);
 * everything else is a sequential, cancellable queue (F6.3) that patches
 * the cache per chat as each one succeeds, so a cancelled or partly failed
 * run still shows exactly what happened.
 */
export async function runBulkAction(
  queryClient: QueryClient,
  action: BulkAction,
  chats: Chat[],
  {
    signal,
    onProgress,
  }: { signal: AbortSignal; onProgress?: (progress: QueueProgress) => void },
): Promise<QueueResult<Chat>> {
  // A refetch already in flight would land afterwards with the pre-run
  // server state and undo the per-chat patches below.
  await queryClient.cancelQueries({ queryKey: dialogsQueryOptions.queryKey })

  if (action.type === 'folder') {
    return allOrNothing(chats, async () => {
      const updated = await folders.setChatsRelation(
        action.folder.id,
        chats.map(peerOf),
        action.relation,
      )
      queryClient.setQueryData(foldersQueryOptions.queryKey, (list) =>
        list?.map((f) => (f.id === updated.id ? updated : f)),
      )
      const ids = new Set(chats.map((c) => c.id))
      queryClient.setQueryData(dialogsQueryOptions.queryKey, (list) =>
        list?.map((chat) => {
          if (!ids.has(chat.id)) return chat
          const next = { ...chat.folders }
          if (action.relation) next[action.folder.id] = action.relation
          else delete next[action.folder.id]
          return { ...chat, folders: next }
        }),
      )
    })
  }

  if (action.type === 'archive' || action.type === 'unarchive') {
    const archived = action.type === 'archive'
    return allOrNothing(chats, async () => {
      await actions.setArchivedMany(chats.map(peerOf), archived)
      for (const chat of chats) {
        patchChat(queryClient, chat.id, { isArchived: archived })
      }
    })
  }

  const type = action.type
  const result = await runQueue(
    chats,
    async (chat) => {
      const peer = peerOf(chat)
      switch (type) {
        case 'mute':
        case 'unmute':
          await actions.setMuted(peer, type === 'mute')
          patchChat(queryClient, chat.id, { isMuted: type === 'mute' })
          break
        case 'markRead':
          await actions.markRead(peer)
          patchChat(queryClient, chat.id, { unreadCount: 0 })
          break
        case 'leave':
          await actions.leaveChat(peer)
          removeChat(queryClient, chat.id)
          break
        case 'delete':
          await actions.deleteChat(peer)
          removeChat(queryClient, chat.id)
          break
        case 'block':
          await actions.blockUser(peer)
          break
      }
    },
    {
      signal,
      onProgress,
      retryAfterSec: (error) => {
        const normalized = normalizeError(error)
        return normalized.code === 'FLOOD_WAIT'
          ? normalized.retryAfterSec
          : undefined
      },
    },
  )

  if ((type === 'leave' || type === 'delete') && result.succeeded.length) {
    void queryClient.invalidateQueries({
      queryKey: foldersQueryOptions.queryKey,
    })
  }
  if (type === 'block' && result.succeeded.length) {
    void queryClient.invalidateQueries({
      queryKey: blockedQueryOptions.queryKey,
    })
  }
  return result
}

/** React state around {@link runBulkAction}: progress, cancel, report. */
export function useBulkRun() {
  const queryClient = useQueryClient()
  const [state, setState] = useState<BulkRunState>({ status: 'idle' })
  const controller = useRef<AbortController | null>(null)

  async function run(action: BulkAction, chats: Chat[], skipped = 0) {
    if (controller.current) return
    const abort = new AbortController()
    controller.current = abort
    setState({
      status: 'running',
      action,
      done: 0,
      total: chats.length,
      cancelling: false,
    })

    const update = (
      patch: Partial<Extract<BulkRunState, { status: 'running' }>>,
    ) =>
      setState((prev) =>
        prev.status === 'running' ? { ...prev, ...patch } : prev,
      )

    // Short FLOOD_WAITs are waited out inside the Telegram layer (≤ 60s);
    // without this the dialog would just sit on "12 of 40" meanwhile.
    const unsubscribe = subscribeFloodWait((waitingSec) =>
      update({ waitingSec }),
    )
    try {
      const result = await runBulkAction(queryClient, action, chats, {
        signal: abort.signal,
        onProgress: ({ done, total, waitingSec }) =>
          update({ done, total, waitingSec }),
      })
      setState({ status: 'done', action, report: toReport(result, skipped) })
    } finally {
      unsubscribe()
      controller.current = null
    }
  }

  function cancel() {
    controller.current?.abort()
    setState((prev) =>
      prev.status === 'running' ? { ...prev, cancelling: true } : prev,
    )
  }

  function reset() {
    setState({ status: 'idle' })
  }

  return { state, run, cancel, reset }
}
