import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useQuery } from '@tanstack/react-query'
import { z } from '#/lib/zod'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Checkbox } from '#/components/ui/checkbox'
import { FolderEmojiInput } from '#/features/matrix/FolderEmojiInput'
import type { Chat, Folder, PeerRef } from '#/telegram/types'
import { dialogsQueryOptions } from '#/queries/dialogs'
import { chatDisplayTitle } from '#/features/matrix/filters'
import {
  useCreateFolder,
  useDeleteFolder,
  useRenameFolder,
} from '#/queries/folders'
import { m } from '#/paraglide/messages'

export function FolderDialog({
  folder,
  open,
  onOpenChange,
}: {
  /** `undefined` means "create a new folder". */
  folder?: Folder
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [chatSearch, setChatSearch] = useState('')
  const [selectedChatIds, setSelectedChatIds] = useState<Set<number>>(
    () => new Set(),
  )

  // Built per render, not at module scope: `m.xxx()` reads the *current*
  // locale, and a module-level schema would freeze its messages in whatever
  // locale was active the first time this file was imported (F8.1).
  const titleSchema = z
    .string()
    .trim()
    .min(1, m.folder_dialog_title_required())
    .max(12, m.folder_dialog_title_too_long())

  const dialogsQuery = useQuery(dialogsQueryOptions)
  const createFolder = useCreateFolder()
  const renameFolder = useRenameFolder()
  const deleteFolder = useDeleteFolder()

  const isCreating = !folder

  const form = useForm({
    defaultValues: {
      title: folder?.title ?? '',
      emoticon: folder?.emoticon ?? '',
    },
    onSubmit: async ({ value }) => {
      const emoticon = value.emoticon.trim() || undefined
      if (folder) {
        await renameFolder.mutateAsync({
          folderId: folder.id,
          title: value.title,
          emoticon,
        })
      } else {
        // Telegram rejects an empty folder (`FILTER_INCLUDE_EMPTY`) unless a
        // category flag is set, and this dialog doesn't offer those — so at
        // least one chat is required up front (ТЗ §3.4/F4.1).
        const chats = dialogsQuery.data ?? []
        const includePeers: PeerRef[] = chats
          .filter((chat) => selectedChatIds.has(chat.id))
          .map((chat) => ({ id: chat.id, kind: chat.kind }))
        await createFolder.mutateAsync({
          title: value.title,
          includePeers,
          emoticon,
        })
      }
      onOpenChange(false)
    },
  })

  const isPending = createFolder.isPending || renameFolder.isPending
  const canDelete = folder && !folder.readOnly
  const canSubmit = !isCreating || selectedChatIds.size > 0

  const filteredChats = isCreating
    ? filterChatsForPicker(dialogsQuery.data ?? [], chatSearch)
    : []

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setConfirmingDelete(false)
        onOpenChange(next)
      }}
    >
      <DialogContent className={isCreating ? 'sm:max-w-md' : undefined}>
        <DialogHeader>
          <DialogTitle>
            {folder
              ? m.folder_dialog_edit_title({ title: folder.title })
              : m.folder_dialog_create_title()}
          </DialogTitle>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
        >
          <div className="flex gap-3">
            <form.Field name="emoticon">
              {(field) => (
                <div className="flex w-20 flex-col gap-1.5">
                  <Label htmlFor={field.name}>
                    {m.folder_dialog_emoji_label()}
                  </Label>
                  <FolderEmojiInput
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="title" validators={{ onChange: titleSchema }}>
              {(field) => (
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor={field.name}>
                    {m.folder_dialog_title_label()}
                  </Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    autoFocus
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-xs text-destructive">
                      {String(
                        field.state.meta.errors[0]?.message ??
                          field.state.meta.errors[0],
                      )}
                    </p>
                  )}
                </div>
              )}
            </form.Field>
          </div>

          {isCreating && (
            <div className="flex flex-col gap-1.5">
              <Label>
                {m.folder_dialog_select_chats_label()} —{' '}
                {m.folder_dialog_selected_count({
                  count: selectedChatIds.size,
                })}
              </Label>
              <Input
                value={chatSearch}
                onChange={(event) => setChatSearch(event.target.value)}
                placeholder={m.folder_dialog_select_chats_search_placeholder()}
              />
              <ul className="flex max-h-56 flex-col overflow-y-auto rounded-md border border-border">
                {filteredChats.length === 0 ? (
                  <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                    {m.folder_dialog_select_chats_empty()}
                  </li>
                ) : (
                  filteredChats.map((chat) => {
                    const checked = selectedChatIds.has(chat.id)
                    return (
                      <li key={chat.id}>
                        <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => {
                              setSelectedChatIds((prev) => {
                                const next = new Set(prev)
                                if (value) next.add(chat.id)
                                else next.delete(chat.id)
                                return next
                              })
                            }}
                          />
                          <span className="truncate">
                            {chatDisplayTitle(chat)}
                          </span>
                        </label>
                      </li>
                    )
                  })
                )}
              </ul>
              {selectedChatIds.size === 0 && (
                <p className="text-xs text-destructive">
                  {m.folder_dialog_select_chats_required()}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="items-center sm:justify-between">
            {canDelete ? (
              confirmingDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {m.folder_dialog_delete_confirm()}
                  </span>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={deleteFolder.isPending}
                    onClick={() => {
                      deleteFolder.mutate(folder.id, {
                        onSuccess: () => onOpenChange(false),
                      })
                    }}
                  >
                    {m.folder_dialog_delete_confirm_yes()}
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmingDelete(true)}
                >
                  {m.folder_dialog_delete()}
                </Button>
              )
            ) : (
              <span />
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {m.folder_dialog_cancel()}
              </Button>
              <form.Subscribe selector={(state) => [state.canSubmit] as const}>
                {([formCanSubmit]) => (
                  <Button
                    type="submit"
                    disabled={!formCanSubmit || !canSubmit || isPending}
                  >
                    {folder ? m.folder_dialog_save() : m.folder_dialog_create()}
                  </Button>
                )}
              </form.Subscribe>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function filterChatsForPicker(chats: Chat[], search: string): Chat[] {
  const q = search.trim().replace(/^@/, '').toLowerCase()
  if (!q) return chats
  return chats.filter((chat) =>
    `${chatDisplayTitle(chat)} ${chat.username ?? ''}`
      .toLowerCase()
      .includes(q),
  )
}
