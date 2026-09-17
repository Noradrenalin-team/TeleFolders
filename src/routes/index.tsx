import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { authStateQueryOptions } from '#/queries/auth'
import { DEFAULT_MATRIX_SEARCH } from '#/features/matrix/filters'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const navigate = useNavigate()
  // getAuthState() talks to mtcute, which is client-only (see src/telegram/client.ts),
  // so the query must stay disabled during SSR and only run after hydration.
  const authState = useQuery({
    ...authStateQueryOptions,
    enabled: typeof window !== 'undefined',
  })

  useEffect(() => {
    // Any failure (including "not configured") is treated as unauthorized:
    // the login screen shows a precise message for each case.
    if (authState.data?.status === 'unauthorized' || authState.isError) {
      void navigate({ to: '/login' })
    } else if (authState.data?.status === 'authorized') {
      void navigate({ to: '/matrix', search: DEFAULT_MATRIX_SEARCH })
    }
  }, [authState.data, authState.isError, navigate])

  return null
}
