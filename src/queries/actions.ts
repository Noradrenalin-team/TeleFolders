import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as actions from '#/telegram/actions'
import { errorMessage } from '#/telegram/error-message'
import type { PeerRef } from '#/telegram/types'
import { dialogsQueryOptions } from '#/queries/dialogs'

export function useSetArchived() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ peer, archived }: { peer: PeerRef; archived: boolean }) =>
      actions.setArchived(peer, archived),
    onMutate: async ({ peer, archived }) => {
      await queryClient.cancelQueries({
        queryKey: dialogsQueryOptions.queryKey,
      })
      const previous = queryClient.getQueryData(dialogsQueryOptions.queryKey)

      queryClient.setQueryData(dialogsQueryOptions.queryKey, (chats) =>
        chats?.map((chat) =>
          chat.id === peer.id ? { ...chat, isArchived: archived } : chat,
        ),
      )

      return { previous }
    },
    onError: (error, _vars, context) => {
      if (context)
        queryClient.setQueryData(dialogsQueryOptions.queryKey, context.previous)
      toast.error(errorMessage(error))
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: dialogsQueryOptions.queryKey,
      })
    },
  })
}

export function useSetPinned() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ peer, pinned }: { peer: PeerRef; pinned: boolean }) =>
      actions.setPinned(peer, pinned),
    onMutate: async ({ peer, pinned }) => {
      await queryClient.cancelQueries({
        queryKey: dialogsQueryOptions.queryKey,
      })
      const previous = queryClient.getQueryData(dialogsQueryOptions.queryKey)

      queryClient.setQueryData(dialogsQueryOptions.queryKey, (chats) =>
        chats?.map((chat) =>
          chat.id === peer.id ? { ...chat, isPinned: pinned } : chat,
        ),
      )

      return { previous }
    },
    onError: (error, _vars, context) => {
      if (context)
        queryClient.setQueryData(dialogsQueryOptions.queryKey, context.previous)
      toast.error(errorMessage(error))
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: dialogsQueryOptions.queryKey,
      })
    },
  })
}
