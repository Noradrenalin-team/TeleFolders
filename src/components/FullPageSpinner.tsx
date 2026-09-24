import { Loader2 } from 'lucide-react'
import { m } from '#/paraglide/messages'

/** Shown while the Telegram session is being checked — connecting to MTProto
 * can take a few seconds, and a blank page looks like a hang. Rendered during
 * SSR too, so it's visible before the client bundle even loads. */
export function FullPageSpinner() {
  return (
    <div
      role="status"
      className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground"
    >
      <Loader2 className="size-8 animate-spin" aria-hidden="true" />
      <span>{m.loading_connecting()}</span>
    </div>
  )
}
