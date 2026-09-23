import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutationState, useQuery } from '@tanstack/react-query'
import { authStateQueryOptions } from '#/queries/auth'
import { blockedQueryOptions, useUnblockUser } from '#/queries/actions'
import { BlockedList } from '#/features/blocked/BlockedList'
import { FullPageSpinner } from '#/components/FullPageSpinner'
import type { BlockedPeer } from '#/telegram/types'

export const Route = createFileRoute('/blocked')({ component: BlockedRoute })

function BlockedRoute() {
  const navigate = useNavigate()
  const authState = useQuery({
    ...authStateQueryOptions,
    enabled: typeof window !== 'undefined',
  })
  const isAuthorized = authState.data?.status === 'authorized'

  const blocked = useQuery({ ...blockedQueryOptions, enabled: isAuthorized })
  const unblock = useUnblockUser()
  const pendingIds = useMutationState({
    filters: { mutationKey: ['blocked', 'unblock'], status: 'pending' },
    select: (mutation) => (mutation.state.variables as BlockedPeer).id,
  })

  useEffect(() => {
    if (authState.data?.status === 'unauthorized' || authState.isError) {
      void navigate({ to: '/login' })
    }
  }, [authState.data, authState.isError, navigate])

  if (!isAuthorized) return <FullPageSpinner />

  return (
    <BlockedList
      peers={blocked.data ?? []}
      isLoading={blocked.isLoading}
      isError={blocked.isError}
      onRetry={() => void blocked.refetch()}
      onUnblock={(peer) => unblock.mutate(peer)}
      isPending={(id) => pendingIds.includes(id)}
    />
  )
}
