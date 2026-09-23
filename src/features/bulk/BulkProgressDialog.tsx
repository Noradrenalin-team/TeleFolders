import { Loader2 } from 'lucide-react'
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
import { chatDisplayTitle } from '#/features/matrix/filters'
import type { BulkRunState } from '#/queries/bulk'
import { m } from '#/paraglide/messages'

/** F6.3: progress while a bulk run is going, the report once it's done. */
export function BulkProgressDialog({
  state,
  onCancel,
  onClose,
}: {
  state: BulkRunState
  onCancel: () => void
  onClose: () => void
}) {
  if (state.status === 'idle') return null
  const title = bulkActionLabel(state.action)

  if (state.status === 'running') {
    const percent = state.total ? (state.done / state.total) * 100 : 0
    // Folder changes and archiving are one request for all chats (F6.5):
    // there's no per-chat progress to count, only "sent" and "done".
    const single =
      state.action.type === 'folder' ||
      state.action.type === 'archive' ||
      state.action.type === 'unarchive'
    return (
      <Dialog open>
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={false}
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription aria-live="polite">
              {single
                ? m.bulk_progress_single({ count: state.total })
                : m.bulk_progress({ done: state.done, total: state.total })}
            </DialogDescription>
          </DialogHeader>
          {single ? (
            <Loader2
              className="mx-auto size-5 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
          ) : (
            <div
              role="progressbar"
              aria-label={title}
              aria-valuemin={0}
              aria-valuemax={state.total}
              aria-valuenow={state.done}
              className="h-2 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full bg-primary transition-[width]"
                style={{ width: `${percent}%` }}
              />
            </div>
          )}
          {state.waitingSec !== undefined && (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {m.bulk_flood_pause({ seconds: state.waitingSec })}
            </p>
          )}
          {!single && (
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={state.cancelling}
                onClick={onCancel}
              >
                {state.cancelling && (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                )}
                {state.cancelling ? m.bulk_cancelling() : m.bulk_cancel()}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    )
  }

  const { report } = state
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      {/* The footer's "Close" is the one way out; a second, identically
          named X would just be announced twice. */}
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{m.bulk_report_title()}</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-1 text-sm">
          <li>{m.bulk_report_succeeded({ count: report.succeeded })}</li>
          {report.cancelled > 0 && (
            <li>{m.bulk_report_cancelled({ count: report.cancelled })}</li>
          )}
          {report.skipped > 0 && (
            <li className="text-muted-foreground">
              {m.bulk_skipped_note({ count: report.skipped })}
            </li>
          )}
        </ul>
        {report.failures.length > 0 && (
          <div className="flex flex-col gap-2 text-sm">
            {report.failures.map(({ reason, chats }) => (
              <div
                key={reason}
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 p-2"
              >
                <p className="font-medium">
                  {m.bulk_report_failed({ count: chats.length, reason })}
                </p>
                <p className="line-clamp-3 text-muted-foreground">
                  {chats.map(chatDisplayTitle).join(', ')}
                </p>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button type="button" onClick={onClose}>
            {m.dialog_close()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
