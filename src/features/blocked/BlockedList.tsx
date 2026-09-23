import { Loader2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { useChatPhoto } from '#/queries/dialogs'
import type { BlockedPeer } from '#/telegram/types'
import { m } from '#/paraglide/messages'

function BlockedRow({
  peer,
  pending,
  onUnblock,
}: {
  peer: BlockedPeer
  pending: boolean
  onUnblock?: (peer: BlockedPeer) => void
}) {
  const photo = useChatPhoto({ id: peer.id, kind: peer.kind })
  const title =
    peer.title || (peer.username ? `@${peer.username}` : String(peer.id))

  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-medium text-muted-foreground">
        {photo.data ? (
          <img src={photo.data} alt="" className="size-full object-cover" />
        ) : (
          title.charAt(0).toUpperCase()
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{title}</p>
        {peer.username && peer.title && (
          <p className="truncate text-xs text-muted-foreground">
            @{peer.username}
          </p>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending || !onUnblock}
        onClick={() => onUnblock?.(peer)}
      >
        {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
        {m.blocked_unblock()}
      </Button>
    </li>
  )
}

/** "Заблокированные" screen body (F5.5). */
export function BlockedList({
  peers,
  isLoading,
  isError,
  onRetry,
  onUnblock,
  isPending,
}: {
  peers: BlockedPeer[]
  isLoading: boolean
  isError?: boolean
  onRetry?: () => void
  onUnblock?: (peer: BlockedPeer) => void
  isPending?: (peerId: number) => boolean
}) {
  return (
    <section className="mx-auto w-full max-w-xl px-4 py-6">
      <h1 className="mb-4 text-lg font-semibold">{m.blocked_title()}</h1>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2
            className="size-5 animate-spin text-muted-foreground"
            aria-label={m.blocked_loading()}
          />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
          <p>{m.blocked_error()}</p>
          {onRetry && (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              {m.blocked_retry()}
            </Button>
          )}
        </div>
      ) : peers.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {m.blocked_empty()}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {peers.map((peer) => (
            <BlockedRow
              key={peer.id}
              peer={peer}
              pending={isPending?.(peer.id) ?? false}
              onUnblock={onUnblock}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
