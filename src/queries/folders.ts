import {
  queryOptions,
  useMutation,
  useMutationState,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import * as folders from '#/telegram/folders'
import { errorMessage } from '#/telegram/error-message'
import type {
  ChatFolderRelation,
  Folder,
  FolderFlag,
  PeerRef,
} from '#/telegram/types'
import { dialogsQueryOptions } from '#/queries/dialogs'
import { m } from '#/paraglide/messages'

export const foldersQueryOptions = queryOptions({
  queryKey: ['folders'],
  queryFn: () => folders.listFolders(),
  staleTime: 60_000,
})

type SetFolderFlagVars = { folderId: number; flag: FolderFlag; value: boolean }
const SET_FLAG_KEY = ['folders', 'setFlag']

/** All currently in-flight `setFolderFlag` calls, keyed by the same
 * `mutationKey` the mutation below uses. A single `useMutation()` hook only
 * ever reflects its *last* triggered call, so clicking two different flag
 * cells in quick succession would otherwise make the first one's spinner
 * disappear early — this instead tracks every pending call at once. */
export function usePendingFolderFlags() {
  return useMutationState({
    filters: { mutationKey: SET_FLAG_KEY, status: 'pending' },
    select: (mutation) => mutation.state.variables as SetFolderFlagVars,
  })
}

export function useSetFolderFlag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: SET_FLAG_KEY,
    mutationFn: ({ folderId, flag, value }: SetFolderFlagVars) =>
      folders.setFolderFlag(folderId, flag, value),
    onMutate: async ({ folderId, flag, value }) => {
      await queryClient.cancelQueries({
        queryKey: foldersQueryOptions.queryKey,
      })
      const previousValue = queryClient
        .getQueryData(foldersQueryOptions.queryKey)
        ?.find((folder) => folder.id === folderId)?.flags[flag]

      queryClient.setQueryData(foldersQueryOptions.queryKey, (list) =>
        list?.map((folder) =>
          folder.id === folderId
            ? { ...folder, flags: { ...folder.flags, [flag]: value } }
            : folder,
        ),
      )

      return { folderId, flag, previousValue }
    },
    onSuccess: (updatedFolder) => {
      // Server-authoritative patch (ТЗ §3.1: read-modify-write against the
      // server's own filter) — no need to invalidate and refetch.
      queryClient.setQueryData(foldersQueryOptions.queryKey, (list) =>
        list?.map((folder) =>
          folder.id === updatedFolder.id ? updatedFolder : folder,
        ),
      )
    },
    onError: (error, _vars, context) => {
      // Roll back just the one flag that failed, not the whole folder list —
      // a snapshot-based rollback would also clobber any other mutation that
      // completed on a *different* folder/flag while this one was in flight.
      if (context?.previousValue !== undefined) {
        const { folderId, flag, previousValue } = context
        queryClient.setQueryData(foldersQueryOptions.queryKey, (list) =>
          list?.map((folder) =>
            folder.id === folderId
              ? { ...folder, flags: { ...folder.flags, [flag]: previousValue } }
              : folder,
          ),
        )
      }
      toast.error(errorMessage(error))
    },
  })
}

type SetChatRelationVars = {
  folderId: number
  peer: PeerRef
  relation: ChatFolderRelation | null
}
const SET_CHAT_RELATION_KEY = ['folders', 'setChatRelation']

/** Same idea as {@link usePendingFolderFlags}, for matrix cell clicks. */
export function usePendingChatRelations() {
  return useMutationState({
    filters: { mutationKey: SET_CHAT_RELATION_KEY, status: 'pending' },
    select: (mutation) => mutation.state.variables as SetChatRelationVars,
  })
}

/** Sets or clears a chat's relation to a folder, with an optimistic update
 * to both caches (F2.6). */
export function useSetChatRelation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: SET_CHAT_RELATION_KEY,
    mutationFn: ({ folderId, peer, relation }: SetChatRelationVars) =>
      folders.setChatRelation(folderId, peer, relation),
    onMutate: async ({ folderId, peer, relation }) => {
      await queryClient.cancelQueries({
        queryKey: dialogsQueryOptions.queryKey,
      })
      await queryClient.cancelQueries({
        queryKey: foldersQueryOptions.queryKey,
      })

      const previousRelation = queryClient
        .getQueryData(dialogsQueryOptions.queryKey)
        ?.find((chat) => chat.id === peer.id)?.folders[folderId]
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

      return {
        folderId,
        peer,
        previousRelation,
        includeCountDelta,
        pinnedCountDelta,
        excludeCountDelta,
      }
    },
    onSuccess: (updatedFolder) => {
      queryClient.setQueryData(foldersQueryOptions.queryKey, (list) =>
        list?.map((folder) =>
          folder.id === updatedFolder.id ? updatedFolder : folder,
        ),
      )
    },
    onError: (error, _vars, context) => {
      // Revert only this chat's relation and the delta it applied — not a
      // full snapshot, for the same reason as `useSetFolderFlag` above.
      if (context) {
        const {
          folderId,
          peer,
          previousRelation,
          includeCountDelta,
          pinnedCountDelta,
          excludeCountDelta,
        } = context

        queryClient.setQueryData(dialogsQueryOptions.queryKey, (chats) =>
          chats?.map((chat) => {
            if (chat.id !== peer.id) return chat
            const nextFolders = { ...chat.folders }
            if (previousRelation) {
              nextFolders[folderId] = previousRelation
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
                    includeCount: folder.includeCount - includeCountDelta,
                    pinnedCount: folder.pinnedCount - pinnedCountDelta,
                    excludeCount: folder.excludeCount - excludeCountDelta,
                  }
                : folder,
            ),
          )
        }
      }
      toast.error(errorMessage(error))
    },
  })
}

/** Folder creation/rename/delete/reorder change the folder list's shape, so
 * these just invalidate rather than trying to optimistically patch it. */
export function useCreateFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      title,
      includePeers,
      emoticon,
    }: {
      title: string
      includePeers: ReadonlyArray<PeerRef>
      emoticon?: string
    }) => folders.createFolder(title, includePeers, emoticon),
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: () => {
      toast.success(m.toast_folder_created())
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
      toast.success(m.toast_folder_renamed())
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
      toast.success(m.toast_folder_deleted())
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
          .filter((folder): folder is Folder => folder !== undefined)
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
