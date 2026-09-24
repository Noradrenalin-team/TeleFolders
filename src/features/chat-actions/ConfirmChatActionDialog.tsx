import { useState } from 'react'
import { Loader2, TriangleAlert } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { chatActionLabel } from '#/features/chat-actions/ChatActionsMenu'
import type { DestructiveChatAction } from '#/features/chat-actions/chat-actions'
import type { Chat } from '#/telegram/types'
import { m } from '#/paraglide/messages'

export type ConfirmOptions = { revoke: boolean; block: boolean }

function texts(
  chat: Chat,
  action: DestructiveChatAction,
): { title: string; description: string; irreversible: boolean } {
  const title = chat.title
  switch (action) {
    case 'delete':
      return chat.kind === 'bot'
        ? {
            title: m.confirm_delete_bot_title({ title }),
            description: m.confirm_delete_bot_description(),
            irreversible: true,
          }
        : {
            title: m.confirm_delete_title({ title }),
            description: m.confirm_delete_description(),
            irreversible: true,
          }
    case 'clearHistory':
      return {
        title: m.confirm_clear_saved_title(),
        description: m.confirm_clear_saved_description(),
        irreversible: true,
      }
    case 'leave':
      return chat.kind === 'channel'
        ? {
            title: m.confirm_unsubscribe_title({ title }),
            description: m.confirm_leave_description(),
            irreversible: false,
          }
        : {
            title: m.confirm_leave_title({ title }),
            description: m.confirm_leave_description(),
            irreversible: false,
          }
    case 'block':
      return {
        title: m.confirm_block_title({ title }),
        description: m.confirm_block_description(),
        irreversible: false,
      }
  }
}

/**
 * Mandatory confirmation for every F5 destructive action (F5.3/F5.4) — there
 * is deliberately no "don't ask again". Spells out what will happen for this
 * particular kind of chat (ТЗ §3 table) and exposes the per-kind options:
 * "delete for both" for a DM, "also block" for a bot.
 */
export function ConfirmChatActionDialog({
  request,
  pending = false,
  onConfirm,
  onOpenChange,
}: {
  request: { chat: Chat; action: DestructiveChatAction } | undefined
  pending?: boolean
  onConfirm: (options: ConfirmOptions) => void
  onOpenChange: (open: boolean) => void
}) {
  const [revoke, setRevoke] = useState(false)
  const [block, setBlock] = useState(false)

  if (!request) return null
  const { chat, action } = request
  const { title, description, irreversible } = texts(chat, action)
  const showRevoke = action === 'delete' && chat.kind === 'user'
  const showBlock = action === 'delete' && chat.kind === 'bot'
  const showOwnerWarning = action === 'leave' && chat.isOwner

  return (
    <Dialog open onOpenChange={pending ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
            {irreversible && ` ${m.confirm_irreversible()}`}
          </DialogDescription>
        </DialogHeader>

        {showOwnerWarning && (
          <p
            role="alert"
            className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
          >
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0 text-destructive"
              aria-hidden="true"
            />
            {m.confirm_leave_owner_warning_group()}
          </p>
        )}

        {showRevoke && (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={revoke}
              disabled={pending}
              onCheckedChange={(value) => setRevoke(value === true)}
            />
            {m.confirm_delete_revoke({ title: chat.title })}
          </label>
        )}

        {showBlock && (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={block}
              disabled={pending}
              onCheckedChange={(value) => setBlock(value === true)}
            />
            {m.confirm_delete_bot_block()}
          </label>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            {m.confirm_cancel()}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => onConfirm({ revoke, block })}
          >
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {chatActionLabel(action, chat)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
