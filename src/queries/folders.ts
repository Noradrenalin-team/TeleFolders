import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import * as folders from '#/telegram/folders'
import { errorMessage } from '#/telegram/error-message'
import type { ChatFolderRelation, FolderFlag, PeerRef } from '#/telegram/types'
import { dialogsQueryOptions } from '#/queries/dialogs'

export const foldersQueryOptions = queryOptions({
  queryKey: ['folders'],
  queryFn: () => folders.listFolders(),
  staleTime: 60_000,
})

export function useSetFolderFlag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      folderId,
      flag,
      value,
    }: {
      folderId: number
      flag: FolderFlag
      value: boolean
    }) => folders.setFolderFlag(folderId, flag, value),
    onMutate: async ({ folderId, flag, value }) => {
      await queryClient.cancelQueries({
        queryKey: foldersQueryOptions.queryKey,
      })
      const previous = queryClient.getQueryData(foldersQueryOptions.queryKey)

      queryClient.setQueryData(foldersQueryOptions.queryKey, (list) =>
        list?.map((folder) =>
          folder.id === folderId
            ? { ...folder, flags: { ...folder.flags, [flag]: value } }
            : folder,
        ),
      )

      return { previous }
    },
    onError: (error, _vars, context) => {
      if (context)
        queryClient.setQueryData(foldersQueryOptions.queryKey, context.previous)
      toast.error(errorMessage(error))
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: foldersQueryOptions.queryKey,
      })
    },
  })
}

/** Sets or clears a chat's relation to a folder, with an optimistic update to both caches (F2.6). */
export function useSetChatRelation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      folderId,
      peer,
      relation,
    }: {
      folderId: number
      peer: PeerRef
      relation: ChatFolderRelation | null
    }) => folders.setChatRelation(folderId, peer, relation),
    onMutate: async ({ folderId, peer, relation }) => {
      await queryClient.cancelQueries({
        queryKey: dialogsQueryOptions.queryKey,
      })
      await queryClient.cancelQueries({
        queryKey: foldersQueryOptions.queryKey,
      })

      const previousDialogs = queryClient.getQueryData(
        dialogsQueryOptions.queryKey,
      )
      const previousFolders = queryClient.getQueryData(
        foldersQueryOptions.queryKey,
      )

      const previousRelation = previousDialogs?.find(
        (chat) => chat.id === peer.id,
      )?.folders[folderId]
      const wasIncluded =
        previousRelation === 'include' || previousRelation === 'pinned'
      const willBeIncluded = relation === 'include' || relation === 'pinned'
      const includeCountDelta = Number(willBeIncluded) - Number(wasIncluded)
      const pinnedCountDelta =
        Number(relation === 'pinned') - Number(previousRelation === 'pinned')
      const excludeCountDelta =
        Number(relation === 'exclude') - Number(previousRelation === 'exclude')

      queryClient.setQueryData(dialogsQueryOptions.queryKey, (chats) =>
        chats?.map((chat) => {
          if (chat.id !== peer.id) return chat
          const nextFolders = { ...chat.folders }
          if (relation) {
            nextFolders[folderId] = relation
          } else {
            delete nextFolders[folderId]
          }
          return { ...chat, folders: nextFolders }
        }),
      )

      if (
        includeCountDelta !== 0 ||
        pinnedCountDelta !== 0 ||
        excludeCountDelta !== 0
      ) {
        queryClient.setQueryData(foldersQueryOptions.queryKey, (list) =>
          list?.map((folder) =>
            folder.id === folderId
              ? {
                  ...folder,
                  includeCount: folder.includeCount + includeCountDelta,
                  pinnedCount: folder.pinnedCount + pinnedCountDelta,
                  excludeCount: folder.excludeCount + excludeCountDelta,
                }
              : folder,
          ),
        )
      }

      return { previousDialogs, previousFolders }
    },
    onError: (error, _vars, context) => {
      if (context) {
        queryClient.setQueryData(
          dialogsQueryOptions.queryKey,
          context.previousDialogs,
        )
        queryClient.setQueryData(
          foldersQueryOptions.queryKey,
          context.previousFolders,
        )
      }
      toast.error(errorMessage(error))
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: dialogsQueryOptions.queryKey,
      })
      void queryClient.invalidateQueries({
        queryKey: foldersQueryOptions.queryKey,
      })
    },
  })
}

/** Folder creation/rename/delete/reorder change the folder list's shape, so
 * these just invalidate rather than trying to optimistically patch it. */
export function useCreateFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ title, emoticon }: { title: string; emoticon?: string }) =>
      folders.createFolder(title, emoticon),
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: foldersQueryOptions.queryKey,
      })
    },
  })
}

export function useRenameFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      folderId,
      title,
      emoticon,
    }: {
      folderId: number
      title: string
      emoticon?: string
    }) => folders.renameFolder(folderId, title, emoticon),
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: foldersQueryOptions.queryKey,
      })
    },
  })
}

export function useDeleteFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (folderId: number) => folders.deleteFolder(folderId),
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: foldersQueryOptions.queryKey,
      })
    },
  })
}

export function useReorderFolders() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ids: number[]) => folders.reorderFolders(ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({
        queryKey: foldersQueryOptions.queryKey,
      })
      const previous = queryClient.getQueryData(foldersQueryOptions.queryKey)

      queryClient.setQueryData(foldersQueryOptions.queryKey, (list) => {
        if (!list) return list
        const byId = new Map(list.map((folder) => [folder.id, folder]))
        return ids
          .map((id) => byId.get(id))
          .filter((folder) => folder !== undefined)
      })

      return { previous }
    },
    onError: (error, _vars, context) => {
      if (context)
        queryClient.setQueryData(foldersQueryOptions.queryKey, context.previous)
      toast.error(errorMessage(error))
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: foldersQueryOptions.queryKey,
      })
    },
  })
}
