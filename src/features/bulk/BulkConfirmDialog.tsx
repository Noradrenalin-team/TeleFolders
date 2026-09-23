import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'
import { bulkActionLabel } from '#/features/bulk/BulkBar'
import type { BulkAction } from '#/features/bulk/bulk-actions'
import { chatDisplayTitle } from '#/features/matrix/filters'
import type { Chat } from '#/telegram/types'
import { m } from '#/paraglide/messages'

const PREVIEW_LIMIT = 10

function description(action: BulkAction): string {
  switch (action.type) {
    case 'delete':
      return m.bulk_confirm_delete_description()
    case 'leave':
      return m.bulk_confirm_leave_description()
    default:
      return m.bulk_confirm_block_description()
  }
}

/**
 * F6.4: a bulk destructive action names the chats it will hit — the first
 * ten plus "and N more" — so nobody deletes 40 chats on a stale selection.
 */
export function BulkConfirmDialog({
  request,
  onConfirm,
  onOpenChange,
}: {
  request: { action: BulkAction; chats: Chat[]; skipped: number } | undefined
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}) {
  if (!request) return null
  const { action, chats, skipped } = request
  const shown = chats.slice(0, PREVIEW_LIMIT)
  const rest = chats.length - shown.length

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {m.bulk_confirm_title({
              action: bulkActionLabel(action),
              count: chats.length,
            })}
          </DialogTitle>
          <DialogDescription>
            {description(action)}{' '}
            {action.type !== 'block' && m.confirm_irreversible()}
          </DialogDescription>
        </DialogHeader>

        <ul className="max-h-60 list-disc overflow-y-auto pl-5 text-sm">
          {shown.map((chat) => (
            <li key={chat.id} className="truncate">
              {chatDisplayTitle(chat)}
            </li>
          ))}
          {rest > 0 && (
            <li className="list-none text-muted-foreground">
              {m.bulk_confirm_more({ count: rest })}
            </li>
          )}
        </ul>

        {skipped > 0 && (
          <p className="text-xs text-muted-foreground">
            {m.bulk_skipped_note({ count: skipped })}
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {m.confirm_cancel()}
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            {bulkActionLabel(action)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
