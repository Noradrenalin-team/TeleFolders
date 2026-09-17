import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
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
import type { Folder } from '#/telegram/types'
import {
  useCreateFolder,
  useDeleteFolder,
  useRenameFolder,
} from '#/queries/folders'
import { m } from '#/paraglide/messages'

const titleSchema = z.string().trim().min(1).max(12)

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
  const createFolder = useCreateFolder()
  const renameFolder = useRenameFolder()
  const deleteFolder = useDeleteFolder()

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
        await createFolder.mutateAsync({ title: value.title, emoticon })
      }
      onOpenChange(false)
    },
  })

  const isPending = createFolder.isPending || renameFolder.isPending
  const canDelete = folder && !folder.readOnly

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setConfirmingDelete(false)
        onOpenChange(next)
      }}
    >
      <DialogContent>
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
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    maxLength={4}
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
                </div>
              )}
            </form.Field>
          </div>

          <DialogFooter className="items-center sm:justify-between">
            {canDelete ? (
              confirmingDelete ? (
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

            <form.Subscribe selector={(state) => [state.canSubmit] as const}>
              {([canSubmit]) => (
                <Button type="submit" disabled={!canSubmit || isPending}>
                  {folder ? m.folder_dialog_save() : m.folder_dialog_create()}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
