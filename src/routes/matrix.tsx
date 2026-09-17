import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useStore } from '@tanstack/react-store'
import { toast } from 'sonner'
import { authStateQueryOptions } from '#/queries/auth'
import {
  foldersQueryOptions,
  useSetChatRelation,
  useSetFolderFlag,
} from '#/queries/folders'
import { dialogsLoadProgress, dialogsQueryOptions } from '#/queries/dialogs'
import { useSetArchived, useSetPinned } from '#/queries/actions'
import { MatrixView } from '#/features/matrix/MatrixView'
import { MatrixToolbar } from '#/features/matrix/MatrixToolbar'
import { FolderDialog } from '#/features/matrix/FolderDialog'
import {
  nextRelation,
  wouldEmptyFolder,
} from '#/features/matrix/relation-cycle'
import {
  filterAndSortChats,
  matrixSearchSchema,
} from '#/features/matrix/filters'
import type { Folder } from '#/telegram/types'
import { m } from '#/paraglide/messages'

export const Route = createFileRoute('/matrix')({
  validateSearch: matrixSearchSchema,
  component: MatrixRoute,
})

function MatrixRoute() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const search = Route.useSearch()

  const authState = useQuery({
    ...authStateQueryOptions,
    enabled: typeof window !== 'undefined',
  })
  const foldersQuery = useQuery(foldersQueryOptions)
  const dialogsQuery = useQuery(dialogsQueryOptions)
  const loadedCount = useStore(dialogsLoadProgress)

  const setChatRelation = useSetChatRelation()
  const setFolderFlag = useSetFolderFlag()
  const setArchived = useSetArchived()
  const setPinned = useSetPinned()

  const [folderDialog, setFolderDialog] = useState<
    { open: false } | { open: true; folder?: Folder }
  >({ open: false })

  useEffect(() => {
    if (authState.data?.status === 'unauthorized' || authState.isError) {
      void navigate({ to: '/login' })
    }
  }, [authState.data, authState.isError, navigate])

  if (!authState.data || authState.data.status === 'unauthorized') {
    return null
  }

  const chats = filterAndSortChats(dialogsQuery.data ?? [], search)

  return (
    <>
      <MatrixView
        folders={foldersQuery.data ?? []}
        chats={chats}
        isLoading={dialogsQuery.isLoading || foldersQuery.isLoading}
        loadedCount={loadedCount}
        isRefreshing={dialogsQuery.isFetching || foldersQuery.isFetching}
        toolbar={
          <MatrixToolbar
            search={search}
            onChange={(patch) => {
              void navigate({
                to: '.',
                search: (prev) => ({ ...prev, ...patch }),
                replace: true,
              })
            }}
          />
        }
        onRefresh={() => {
          void queryClient.invalidateQueries({
            queryKey: foldersQueryOptions.queryKey,
          })
          void queryClient.invalidateQueries({
            queryKey: dialogsQueryOptions.queryKey,
          })
        }}
        onCycleRelation={(chat, folder, current) => {
          if (wouldEmptyFolder(folder, current)) {
            toast.error(m.error_folder_empty())
            return
          }
          const next = nextRelation(current)
          setChatRelation.mutate({
            folderId: folder.id,
            peer: { id: chat.id, kind: chat.kind },
            relation: next,
          })
        }}
        onSetArchived={(chat, archived) => {
          setArchived.mutate({
            peer: { id: chat.id, kind: chat.kind },
            archived,
          })
        }}
        onTogglePinned={(chat, pinned) => {
          setPinned.mutate({ peer: { id: chat.id, kind: chat.kind }, pinned })
        }}
        onToggleFlag={(folder, flag, next) => {
          setFolderFlag.mutate({ folderId: folder.id, flag, value: next })
        }}
        onSelectFolder={(folder) => setFolderDialog({ open: true, folder })}
        onAddFolder={() => setFolderDialog({ open: true })}
        isArchivePending={(chatId) =>
          setArchived.isPending && setArchived.variables.peer.id === chatId
        }
        isRelationPending={(chatId, folderId) =>
          setChatRelation.isPending &&
          setChatRelation.variables.peer.id === chatId &&
          setChatRelation.variables.folderId === folderId
        }
        isFlagPending={(folderId, flag) =>
          setFolderFlag.isPending &&
          setFolderFlag.variables.folderId === folderId &&
          setFolderFlag.variables.flag === flag
        }
      />

      <FolderDialog
        open={folderDialog.open}
        folder={folderDialog.open ? folderDialog.folder : undefined}
        onOpenChange={(open) =>
          setFolderDialog(open ? folderDialog : { open: false })
        }
      />
    </>
  )
}
