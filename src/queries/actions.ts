import {
  mutationOptions,
  queryOptions,
  useMutation,
  useMutationState,
  useQueryClient,
} from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as actions from '#/telegram/actions'
import { errorMessage } from '#/telegram/error-message'
import type { BlockedPeer, Chat, PeerRef } from '#/telegram/types'
import { dialogsQueryOptions } from '#/queries/dialogs'
import { foldersQueryOptions } from '#/queries/folders'
import { m } from '#/paraglide/messages'

type SetArchivedVars = { peer: PeerRef; archived: boolean }
const SET_ARCHIVED_KEY = ['dialogs', 'setArchived']

/** In-flight `setArchived` calls (see `usePendingFolderFlags` for why a
 * plain `.isPending` on the hook isn't enough once more than one row is
 * mid-click at a time). */
export function usePendingArchive() {
  return useMutationState({
    filters: { mutationKey: SET_ARCHIVED_KEY, status: 'pending' },
    select: (mutation) => mutation.state.variables as SetArchivedVars,
  })
}

export function setArchivedMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationKey: SET_ARCHIVED_KEY,
    mutationFn: ({ peer, archived }: SetArchivedVars) =>
      actions.setArchived(peer, archived),
    onMutate: async ({ peer, archived }) => {
      await queryClient.cancelQueries({
        queryKey: dialogsQueryOptions.queryKey,
      })
      const previous = queryClient
        .getQueryData(dialogsQueryOptions.queryKey)
        ?.find((chat) => chat.id === peer.id)?.isArchived

      queryClient.setQueryData(dialogsQueryOptions.queryKey, (chats) =>
        chats?.map((chat) =>
          chat.id === peer.id ? { ...chat, isArchived: archived } : chat,
        ),
      )

      return { peer, previous }
    },
    onError: (error, _vars, context) => {
      if (context?.previous !== undefined) {
        const { peer, previous } = context
        queryClient.setQueryData(dialogsQueryOptions.queryKey, (chats) =>
          chats?.map((chat) =>
            chat.id === peer.id ? { ...chat, isArchived: previous } : chat,
          ),
        )
      }
      toast.error(errorMessage(error))
    },
  })
}

export function useSetArchived() {
  return useMutation(setArchivedMutation(useQueryClient()))
}

type SetPinnedVars = { peer: PeerRef; pinned: boolean }
const SET_PINNED_KEY = ['dialogs', 'setPinned']

export function usePendingPinned() {
  return useMutationState({
    filters: { mutationKey: SET_PINNED_KEY, status: 'pending' },
    select: (mutation) => mutation.state.variables as SetPinnedVars,
  })
}

export function setPinnedMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationKey: SET_PINNED_KEY,
    mutationFn: ({ peer, pinned }: SetPinnedVars) =>
      actions.setPinned(peer, pinned),
    onMutate: async ({ peer, pinned }) => {
      await queryClient.cancelQueries({
        queryKey: dialogsQueryOptions.queryKey,
      })
      const previous = queryClient
        .getQueryData(dialogsQueryOptions.queryKey)
        ?.find((chat) => chat.id === peer.id)?.isPinned

      queryClient.setQueryData(dialogsQueryOptions.queryKey, (chats) =>
        chats?.map((chat) =>
          chat.id === peer.id ? { ...chat, isPinned: pinned } : chat,
        ),
      )

      return { peer, previous }
    },
    onError: (error, _vars, context) => {
      if (context?.previous !== undefined) {
        const { peer, previous } = context
        queryClient.setQueryData(dialogsQueryOptions.queryKey, (chats) =>
          chats?.map((chat) =>
            chat.id === peer.id ? { ...chat, isPinned: previous } : chat,
          ),
        )
      }
      toast.error(errorMessage(error))
    },
  })
}

export function useSetPinned() {
  return useMutation(setPinnedMutation(useQueryClient()))
}

export function patchChat(
  queryClient: QueryClient,
  chatId: number,
  patch: Partial<Chat>,
): void {
  queryClient.setQueryData(dialogsQueryOptions.queryKey, (chats) =>
    chats?.map((chat) => (chat.id === chatId ? { ...chat, ...patch } : chat)),
  )
}

export function removeChat(queryClient: QueryClient, chatId: number): void {
  queryClient.setQueryData(dialogsQueryOptions.queryKey, (chats) =>
    chats?.filter((chat) => chat.id !== chatId),
  )
}

function peerOf(chat: Pick<Chat, 'id' | 'kind'>): PeerRef {
  return { id: chat.id, kind: chat.kind }
}

export function setMutedMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: ({ chat, muted }: { chat: Chat; muted: boolean }) =>
      actions.setMuted(peerOf(chat), muted),
    onMutate: async ({ chat, muted }) => {
      await queryClient.cancelQueries({
        queryKey: dialogsQueryOptions.queryKey,
      })
      patchChat(queryClient, chat.id, { isMuted: muted })
      return { previous: chat.isMuted }
    },
    onError: (error, { chat }, context) => {
      if (context)
        patchChat(queryClient, chat.id, { isMuted: context.previous })
      toast.error(errorMessage(error))
    },
  })
}

export function useSetMuted() {
  return useMutation(setMutedMutation(useQueryClient()))
}

export function markReadMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: ({ chat }: { chat: Chat }) => actions.markRead(peerOf(chat)),
    onMutate: async ({ chat }) => {
      await queryClient.cancelQueries({
        queryKey: dialogsQueryOptions.queryKey,
      })
      patchChat(queryClient, chat.id, { unreadCount: 0 })
      return { previous: chat.unreadCount }
    },
    onError: (error, { chat }, context) => {
      if (context) {
        patchChat(queryClient, chat.id, { unreadCount: context.previous })
      }
      toast.error(errorMessage(error))
    },
  })
}

export function useMarkRead() {
  return useMutation(markReadMutation(useQueryClient()))
}

/**
 * Destructive actions aren't optimistic: they can't be rolled back on the
 * server, so the chat only leaves the cache once Telegram confirms it
 * (F5.7: every one of them ends in a result toast either way). Folder
 * counters change along with the chat, hence the `folders` invalidation.
 */
function destructiveMutation<TVars extends { chat: Chat }>(
  queryClient: QueryClient,
  mutationFn: (vars: TVars) => Promise<void>,
  onDone: (vars: TVars) => string,
) {
  return mutationOptions({
    mutationKey: DESTRUCTIVE_KEY,
    mutationFn,
    onSuccess: (_data, vars) => {
      toast.success(onDone(vars))
      void queryClient.invalidateQueries({
        queryKey: foldersQueryOptions.queryKey,
      })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}

const DESTRUCTIVE_KEY = ['dialogs', 'destructive']

export function usePendingDestructive() {
  return useMutationState({
    filters: { mutationKey: DESTRUCTIVE_KEY, status: 'pending' },
    select: (mutation) => (mutation.state.variables as { chat: Chat }).chat.id,
  })
}

export function deleteChatMutation(queryClient: QueryClient) {
  return destructiveMutation(
    queryClient,
    ({
      chat,
      revoke,
      block,
    }: {
      chat: Chat
      revoke?: boolean
      block?: boolean
    }) => actions.deleteChat(peerOf(chat), { revoke, block }),
    ({ chat, block }) => {
      if (chat.kind === 'saved') return m.chat_action_done_cleared()
      if (block) {
        void queryClient.invalidateQueries({
          queryKey: blockedQueryOptions.queryKey,
        })
      }
      removeChat(queryClient, chat.id)
      return m.chat_action_done_deleted({ title: chat.title })
    },
  )
}

export function leaveChatMutation(queryClient: QueryClient) {
  return destructiveMutation(
    queryClient,
    ({ chat }: { chat: Chat }) => actions.leaveChat(peerOf(chat)),
    ({ chat }) => {
      removeChat(queryClient, chat.id)
      return chat.kind === 'channel'
        ? m.chat_action_done_unsubscribed({ title: chat.title })
        : m.chat_action_done_left({ title: chat.title })
    },
  )
}

export function blockUserMutation(queryClient: QueryClient) {
  return destructiveMutation(
    queryClient,
    ({ chat }: { chat: Chat }) => actions.blockUser(peerOf(chat)),
    ({ chat }) => {
      void queryClient.invalidateQueries({
        queryKey: blockedQueryOptions.queryKey,
      })
      return m.chat_action_done_blocked({ title: chat.title })
    },
  )
}

export function useDeleteChat() {
  return useMutation(deleteChatMutation(useQueryClient()))
}

export function useLeaveChat() {
  return useMutation(leaveChatMutation(useQueryClient()))
}

export function useBlockUser() {
  return useMutation(blockUserMutation(useQueryClient()))
}

export const blockedQueryOptions = queryOptions({
  queryKey: ['blocked'],
  queryFn: () => actions.listBlocked(),
  staleTime: 60_000,
})

export function unblockUserMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationKey: ['blocked', 'unblock'],
    mutationFn: (peer: BlockedPeer) => actions.unblockUser(peer),
    onSuccess: (_data, peer) => {
      queryClient.setQueryData(blockedQueryOptions.queryKey, (list) =>
        list?.filter((p) => p.id !== peer.id),
      )
      toast.success(m.chat_action_done_unblocked({ title: peer.title }))
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}

export function useUnblockUser() {
  return useMutation(unblockUserMutation(useQueryClient()))
}
