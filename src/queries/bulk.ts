import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import * as actions from '#/telegram/actions'
import * as folders from '#/telegram/folders'
import { normalizeError } from '#/telegram/errors'
import { errorMessage } from '#/telegram/error-message'
import type { Chat, PeerRef } from '#/telegram/types'
import { runQueue } from '#/features/bulk/run-queue'
import type { QueueResult } from '#/features/bulk/run-queue'
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

function toReport(result: QueueResult<Chat>, skipped: number): BulkReport {
  const byReason = new Map<string, Chat[]>()
  for (const { item, error } of result.failed) {
    const reason = errorMessage(error)
    byReason.set(reason, [...(byReason.get(reason) ?? []), item])
  }
  return {
    succeeded: result.succeeded.length,
    cancelled: result.cancelled.length,
    skipped,
    failures: [...byReason].map(([reason, chats]) => ({ reason, chats })),
  }
}

/**
 * Runs one F6 bulk action over the selected chats. Folder changes and
 * archiving go out as a single request (F6.5); everything else is a
 * sequential, cancellable queue (F6.3) that patches the cache per chat as
 * each one succeeds, so a cancelled or partly failed run still shows
 * exactly what happened.
 */
export function useBulkRun() {
  const queryClient = useQueryClient()
  const [state, setState] = useState<BulkRunState>({ status: 'idle' })
  const controller = useRef<AbortController | null>(null)

  async function runAll(
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

  async function run(action: BulkAction, chats: Chat[], skipped = 0) {
    if (state.status === 'running') return
    const abort = new AbortController()
    controller.current = abort
    const base = { status: 'running', action, cancelling: false } as const
    setState({ ...base, done: 0, total: chats.length })

    let result: QueueResult<Chat>

    if (action.type === 'folder') {
      result = await runAll(chats, async () => {
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
    } else if (action.type === 'archive' || action.type === 'unarchive') {
      const archived = action.type === 'archive'
      result = await runAll(chats, async () => {
        await actions.setArchivedMany(chats.map(peerOf), archived)
        for (const chat of chats) {
          patchChat(queryClient, chat.id, { isArchived: archived })
        }
      })
    } else {
      const type = action.type
      result = await runQueue(
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
          signal: abort.signal,
          retryAfterSec: (error) => {
            const normalized = normalizeError(error)
            return normalized.code === 'FLOOD_WAIT'
              ? normalized.retryAfterSec
              : undefined
          },
          onProgress: ({ done, total, waitingSec }) =>
            setState((prev) => ({
              ...base,
              cancelling: prev.status === 'running' && prev.cancelling,
              done,
              total,
              waitingSec,
            })),
        },
      )

      if (type === 'leave' || type === 'delete') {
        void queryClient.invalidateQueries({
          queryKey: foldersQueryOptions.queryKey,
        })
      }
      if (type === 'block') {
        void queryClient.invalidateQueries({
          queryKey: blockedQueryOptions.queryKey,
        })
      }
    }

    controller.current = null
    setState({ status: 'done', action, report: toReport(result, skipped) })
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
