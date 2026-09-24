import { useEffect, useRef, useState } from 'react'
import {
  createFileRoute,
  stripSearchParams,
  useNavigate,
} from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useStore } from '@tanstack/react-store'
import { toast } from 'sonner'
import { authStateQueryOptions } from '#/queries/auth'
import {
  foldersQueryOptions,
  usePendingChatRelations,
  usePendingFolderFlags,
  useReorderFolders,
  useSetChatRelation,
  useSetFolderFlag,
} from '#/queries/folders'
import { dialogsLoadProgress, dialogsQueryOptions } from '#/queries/dialogs'
import {
  blockedQueryOptions,
  useBlockUser,
  useDeleteChat,
  useLeaveChat,
  useMarkRead,
  usePendingArchive,
  usePendingDestructive,
  usePendingPinned,
  useSetArchived,
  useSetMuted,
  useSetPinned,
  useUnblockUser,
} from '#/queries/actions'
import { MatrixView } from '#/features/matrix/MatrixView'
import { MatrixToolbar } from '#/features/matrix/MatrixToolbar'
import { FolderDialog } from '#/features/matrix/FolderDialog'
import { ChatCard } from '#/features/chat-card/ChatCard'
import { ConfirmChatActionDialog } from '#/features/chat-actions/ConfirmChatActionDialog'
import type { ConfirmOptions } from '#/features/chat-actions/ConfirmChatActionDialog'
import {
  isDestructive,
  telegramLink,
} from '#/features/chat-actions/chat-actions'
import type {
  ChatAction,
  DestructiveChatAction,
} from '#/features/chat-actions/chat-actions'
import {
  nextRelation,
  wouldEmptyFolder,
  wouldEmptyFolderByFlag,
  wouldEmptyFolderTo,
} from '#/features/matrix/relation-cycle'
import {
  DEFAULT_MATRIX_SEARCH,
  filterAndSortChats,
  hasActiveMatrixFilters,
  matrixSearchSchema,
} from '#/features/matrix/filters'
import { setShowArchived } from '#/stores/settings'
import type { Chat, ChatFolderRelation, Folder } from '#/telegram/types'
import { m } from '#/paraglide/messages'
import { FullPageSpinner } from '#/components/FullPageSpinner'
import { useBulkRun } from '#/queries/bulk'
import { BulkBar } from '#/features/bulk/BulkBar'
import { BulkConfirmDialog } from '#/features/bulk/BulkConfirmDialog'
import { BulkProgressDialog } from '#/features/bulk/BulkProgressDialog'
import {
  appliesTo,
  bulkWouldEmptyFolder,
  isDestructiveBulk,
} from '#/features/bulk/bulk-actions'
import type { BulkAction } from '#/features/bulk/bulk-actions'
import { toggleSelection } from '#/features/bulk/selection'

export const Route = createFileRoute('/matrix')({
  validateSearch: matrixSearchSchema,
  // Keeps default-valued search params out of the URL bar (F3.5) — e.g. a
  // fresh `/matrix` doesn't turn into `/matrix?q=&type=all&sort=default&...`
  // the moment the toolbar's own defaults round-trip through it.
  search: { middlewares: [stripSearchParams(DEFAULT_MATRIX_SEARCH)] },
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
  const isAuthorized = authState.data?.status === 'authorized'

  const foldersQuery = useQuery({
    ...foldersQueryOptions,
    enabled: isAuthorized,
  })
  const dialogsQuery = useQuery({
    ...dialogsQueryOptions,
    enabled: isAuthorized,
  })
  const loadedCount = useStore(dialogsLoadProgress)

  const setChatRelation = useSetChatRelation()
  const setFolderFlag = useSetFolderFlag()
  const setArchived = useSetArchived()
  const setPinned = useSetPinned()
  const reorderFolders = useReorderFolders()
  const setMuted = useSetMuted()
  const markRead = useMarkRead()
  const deleteChat = useDeleteChat()
  const leaveChat = useLeaveChat()
  const blockUser = useBlockUser()
  const unblockUser = useUnblockUser()
  // Dialogs don't say whether a user is blocked; one cheap call does.
  const blockedQuery = useQuery({
    ...blockedQueryOptions,
    enabled: isAuthorized,
  })
  const blockedIds = new Set(blockedQuery.data?.map((peer) => peer.id))
  const pendingDestructive = usePendingDestructive()

  const bulk = useBulkRun()
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<number>>(
    () => new Set(),
  )
  const selectionAnchor = useRef<number | undefined>(undefined)
  const [bulkConfirm, setBulkConfirm] = useState<
    { action: BulkAction; chats: Chat[]; skipped: number } | undefined
  >()

  const [confirm, setConfirm] = useState<
    { chat: Chat; action: DestructiveChatAction } | undefined
  >()

  const pendingRelations = usePendingChatRelations()
  const pendingFlags = usePendingFolderFlags()
  const pendingArchive = usePendingArchive()
  const pendingPinned = usePendingPinned()

  const [folderDialog, setFolderDialog] = useState<
    { open: false } | { open: true; folder?: Folder }
  >({ open: false })

  useEffect(() => {
    const signedOut = authState.data && authState.data.status !== 'authorized'
    if (signedOut || authState.isError) {
      void navigate({ to: '/login' })
    }
  }, [authState.data, authState.isError, navigate])

  if (authState.data?.status !== 'authorized') {
    return <FullPageSpinner />
  }

  const folders = foldersQuery.data ?? []
  const allChats = dialogsQuery.data ?? []
  const chats = filterAndSortChats(allChats, search)
  const openChat = chats.find((chat) => chat.id === search.chat)
  const openChatIndex = openChat ? chats.indexOf(openChat) : -1

  // Selection is by id and survives filtering, but actions only ever apply
  // to chats that are still visible — a hidden selected chat is never hit
  // by an action the user can't see it in (F6.1).
  const selectedChats = chats.filter((chat) => selectedIds.has(chat.id))
  const visibleIds = chats.map((chat) => chat.id)

  function applicableChats(action: BulkAction): Chat[] {
    return selectedChats.filter((chat) =>
      appliesTo(action, chat, { isBlocked: blockedIds.has(chat.id) }),
    )
  }

  function runBulk(action: BulkAction) {
    const targets = applicableChats(action)
    if (targets.length === 0) return
    const skipped = selectedChats.length - targets.length
    if (action.type === 'folder' && bulkWouldEmptyFolder(action, targets)) {
      toast.error(m.error_folder_empty())
      return
    }
    if (isDestructiveBulk(action)) {
      setBulkConfirm({ action, chats: targets, skipped })
      return
    }
    void bulk.run(action, targets, skipped)
  }

  // Leaves only the failed chats selected, ready for a retry.
  function finishBulk() {
    if (bulk.state.status === 'done') {
      const failed = bulk.state.report.failures.flatMap((f) => f.chats)
      setSelectedIds(new Set(failed.map((chat) => chat.id)))
    }
    bulk.reset()
  }

  function updateSearch(patch: Partial<typeof search>) {
    void navigate({
      to: '.',
      search: (prev) => ({ ...prev, ...patch }),
      replace: true,
    })
  }

  function cycleRelation(
    chat: Pick<Chat, 'id' | 'kind'>,
    folder: Folder,
    current: ChatFolderRelation | undefined,
  ) {
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
  }

  function setRelation(
    chat: Pick<Chat, 'id' | 'kind'>,
    folder: Folder,
    current: ChatFolderRelation | undefined,
    next: ChatFolderRelation | null,
  ) {
    if ((current ?? null) === next) return
    if (wouldEmptyFolderTo(folder, current, next)) {
      toast.error(m.error_folder_empty())
      return
    }
    setChatRelation.mutate({
      folderId: folder.id,
      peer: { id: chat.id, kind: chat.kind },
      relation: next,
    })
  }

  function runChatAction(chat: Chat, action: ChatAction) {
    if (isDestructive(action)) {
      setConfirm({ chat, action })
      return
    }
    const peer = { id: chat.id, kind: chat.kind }
    switch (action) {
      case 'pin':
      case 'unpin':
        setPinned.mutate({ peer, pinned: action === 'pin' })
        break
      case 'archive':
      case 'unarchive':
        setArchived.mutate({ peer, archived: action === 'archive' })
        break
      case 'mute':
      case 'unmute':
        setMuted.mutate({ chat, muted: action === 'mute' })
        break
      case 'markRead':
        markRead.mutate({ chat })
        break
      case 'unblock':
        unblockUser.mutate({ id: chat.id, kind: chat.kind, title: chat.title })
        break
      case 'openInTelegram': {
        const link = telegramLink(chat)
        if (link) window.open(link, '_blank', 'noopener,noreferrer')
        break
      }
    }
  }

  function confirmChatAction(options: ConfirmOptions) {
    if (!confirm) return
    const { chat, action } = confirm
    const removesChat = action === 'delete' || action === 'leave'
    const close = {
      onSuccess: () => {
        // The card would otherwise point at a chat that no longer exists.
        if (removesChat && search.chat === chat.id) {
          updateSearch({ chat: undefined })
        }
      },
      onSettled: () => setConfirm(undefined),
    }
    switch (action) {
      case 'delete':
      case 'clearHistory':
        deleteChat.mutate({ chat, ...options }, close)
        break
      case 'leave':
        leaveChat.mutate({ chat }, close)
        break
      case 'block':
        blockUser.mutate({ chat }, close)
        break
    }
  }

  const confirmPending =
    confirm !== undefined && pendingDestructive.includes(confirm.chat.id)

  return (
    <>
      <MatrixView
        folders={folders}
        chats={chats}
        totalCount={allChats.length}
        hasActiveFilters={hasActiveMatrixFilters(search)}
        isLoading={dialogsQuery.isLoading || foldersQuery.isLoading}
        isError={dialogsQuery.isError || foldersQuery.isError}
        loadedCount={loadedCount}
        isRefreshing={dialogsQuery.isFetching || foldersQuery.isFetching}
        toolbar={
          <MatrixToolbar
            search={search}
            onChange={(patch) => {
              if (patch.archived !== undefined) setShowArchived(patch.archived)
              updateSearch(patch)
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
        onRetry={() => {
          void queryClient.invalidateQueries({
            queryKey: foldersQueryOptions.queryKey,
          })
          void queryClient.invalidateQueries({
            queryKey: dialogsQueryOptions.queryKey,
          })
        }}
        onResetFilters={() =>
          updateSearch({ ...DEFAULT_MATRIX_SEARCH, archived: search.archived })
        }
        onCycleRelation={cycleRelation}
        onSetRelation={setRelation}
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
          if (wouldEmptyFolderByFlag(folder, flag, next)) {
            toast.error(m.error_folder_empty())
            return
          }
          setFolderFlag.mutate({ folderId: folder.id, flag, value: next })
        }}
        onSelectFolder={(folder) => setFolderDialog({ open: true, folder })}
        onAddFolder={() => setFolderDialog({ open: true })}
        onOpenChat={(chat) => updateSearch({ chat: chat.id })}
        onReorderFolders={(ids) => reorderFolders.mutate(ids)}
        onChatAction={runChatAction}
        selection={{
          isSelected: (chatId) => selectedIds.has(chatId),
          onClear: () => setSelectedIds(new Set()),
          selected: selectedIds,
          onReplace: (next, anchor) => {
            selectionAnchor.current = anchor
            setSelectedIds(next)
          },
          onToggle: (chat, shift) => {
            const next = toggleSelection(
              selectedIds,
              visibleIds,
              chat.id,
              selectionAnchor.current,
              shift,
            )
            selectionAnchor.current = next.anchor
            setSelectedIds(next.selected)
          },
          selectAll: {
            checked:
              selectedChats.length === 0
                ? false
                : selectedChats.length === chats.length
                  ? true
                  : 'indeterminate',
            onToggle: () =>
              setSelectedIds(
                selectedChats.length === chats.length
                  ? new Set()
                  : new Set(visibleIds),
              ),
          },
        }}
        footer={
          selectedChats.length > 0 ? (
            <BulkBar
              selectedCount={selectedChats.length}
              matchingCount={chats.length}
              folders={folders}
              applicableCount={(action) => applicableChats(action).length}
              disabled={bulk.state.status === 'running'}
              onRun={runBulk}
              onSelectAllMatching={() => setSelectedIds(new Set(visibleIds))}
              onClear={() => setSelectedIds(new Set())}
            />
          ) : undefined
        }
        isChatBlocked={(chatId) => blockedIds.has(chatId)}
        isChatBusy={(chatId) => pendingDestructive.includes(chatId)}
        isArchivePending={(chatId) =>
          pendingArchive.some((v) => v.peer.id === chatId)
        }
        isPinnedPending={(chatId) =>
          pendingPinned.some((v) => v.peer.id === chatId)
        }
        isRelationPending={(chatId, folderId) =>
          pendingRelations.some(
            (v) => v.peer.id === chatId && v.folderId === folderId,
          )
        }
        isFlagPending={(folderId, flag) =>
          pendingFlags.some((v) => v.folderId === folderId && v.flag === flag)
        }
      />

      <FolderDialog
        key={`folder:${folderDialog.open ? (folderDialog.folder?.id ?? 'new') : 'closed'}`}
        open={folderDialog.open}
        folder={folderDialog.open ? folderDialog.folder : undefined}
        onOpenChange={(open) =>
          setFolderDialog(open ? folderDialog : { open: false })
        }
      />

      <ChatCard
        chat={openChat}
        folders={folders}
        open={openChat !== undefined}
        onOpenChange={(open) => {
          if (!open) updateSearch({ chat: undefined })
        }}
        canGoPrev={openChatIndex > 0}
        canGoNext={openChatIndex !== -1 && openChatIndex < chats.length - 1}
        onPrev={() => {
          if (openChatIndex > 0)
            updateSearch({ chat: chats[openChatIndex - 1].id })
        }}
        onNext={() => {
          if (openChatIndex !== -1 && openChatIndex < chats.length - 1) {
            updateSearch({ chat: chats[openChatIndex + 1].id })
          }
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
        onCycleRelation={cycleRelation}
        onChatAction={runChatAction}
        isBlocked={openChat !== undefined && blockedIds.has(openChat.id)}
        isRelationPending={(chatId, folderId) =>
          pendingRelations.some(
            (v) => v.peer.id === chatId && v.folderId === folderId,
          )
        }
      />

      <BulkConfirmDialog
        request={bulkConfirm}
        onOpenChange={(open) => {
          if (!open) setBulkConfirm(undefined)
        }}
        onConfirm={() => {
          if (!bulkConfirm) return
          const { action, chats: targets, skipped } = bulkConfirm
          setBulkConfirm(undefined)
          void bulk.run(action, targets, skipped)
        }}
      />

      <BulkProgressDialog
        state={bulk.state}
        onCancel={bulk.cancel}
        onClose={finishBulk}
      />

      <ConfirmChatActionDialog
        key={`confirm:${confirm ? `${confirm.chat.id}:${confirm.action}` : 'closed'}`}
        request={confirm}
        pending={confirmPending}
        onConfirm={confirmChatAction}
        onOpenChange={(open) => {
          if (!open) setConfirm(undefined)
        }}
      />
    </>
  )
}
