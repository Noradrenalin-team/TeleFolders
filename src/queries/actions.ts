import {
  useMutation,
  useMutationState,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import * as actions from '#/telegram/actions'
import { errorMessage } from '#/telegram/error-message'
import type { PeerRef } from '#/telegram/types'
import { dialogsQueryOptions } from '#/queries/dialogs'

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

export function useSetArchived() {
  const queryClient = useQueryClient()

  return useMutation({
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

type SetPinnedVars = { peer: PeerRef; pinned: boolean }
const SET_PINNED_KEY = ['dialogs', 'setPinned']

export function usePendingPinned() {
  return useMutationState({
    filters: { mutationKey: SET_PINNED_KEY, status: 'pending' },
    select: (mutation) => mutation.state.variables as SetPinnedVars,
  })
}

export function useSetPinned() {
  const queryClient = useQueryClient()

  return useMutation({
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
