import { WifiOff } from 'lucide-react'
import { m } from '#/paraglide/messages'

/** F9.2 banner shown while the connection to Telegram is being restored. */
export function ConnectionBanner() {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 border-b border-border bg-amber-100 px-4 py-1.5 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100"
    >
      <WifiOff className="size-4" aria-hidden="true" />
      {m.connection_lost()}
    </div>
  )
}
