import { useQuery } from '@tanstack/react-query'
import { authStateQueryOptions } from '#/queries/auth'
import { useConnectionLost, useTelegramSync } from '#/queries/sync'
import { ConnectionBanner } from '#/components/ConnectionBanner'

/** Live updates from other Telegram clients + the F9.2 "reconnecting"
 * banner, both only while signed in. */
export function TelegramSync() {
  const authState = useQuery({
    ...authStateQueryOptions,
    enabled: typeof window !== 'undefined',
  })
  const signedIn = authState.data?.status === 'authorized'

  useTelegramSync(signedIn)
  const connectionLost = useConnectionLost(signedIn)

  return connectionLost ? <ConnectionBanner /> : null
}
