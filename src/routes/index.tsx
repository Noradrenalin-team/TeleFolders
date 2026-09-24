import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { authStateQueryOptions } from '#/queries/auth'
import { isTelegramConfigured } from '#/telegram/client'
import { matrixEntrySearch } from '#/features/matrix/filters'
import { readPersistedShowArchived } from '#/stores/settings'
import { Button } from '#/components/ui/button'
import { FullPageSpinner } from '#/components/FullPageSpinner'
import { m } from '#/paraglide/messages'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const navigate = useNavigate()
  const configured = typeof window !== 'undefined' && isTelegramConfigured()

  // getAuthState() talks to mtcute, which is client-only (see
  // src/telegram/client.ts), so the query must stay disabled during SSR and
  // only run after hydration — and only once configured, since an
  // unconfigured app has no client to ask at all (login.tsx shows that
  // message on its own, this route just needs to get there).
  const authState = useQuery({
    ...authStateQueryOptions,
    enabled: configured,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!configured) {
      void navigate({ to: '/login' })
      return
    }
    if (authState.data?.status === 'authorized') {
      void navigate({
        to: '/matrix',
        search: matrixEntrySearch(readPersistedShowArchived()),
      })
    } else if (authState.data) {
      void navigate({ to: '/login' })
    }
  }, [configured, authState.data, navigate])

  // A real failure (network down, MTProto unreachable) is not the same as
  // "you're logged out" — bouncing straight to /login here would be
  // misleading, so this shows its own retry instead (F9.2).
  if (configured && authState.isError) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-3 px-4 py-24 text-center">
        <p className="text-sm text-muted-foreground">{m.matrix_load_error()}</p>
        <Button type="button" onClick={() => void authState.refetch()}>
          {m.matrix_retry()}
        </Button>
      </div>
    )
  }

  return <FullPageSpinner />
}
