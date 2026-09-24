import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useStore } from '@tanstack/react-store'
import { authStateQueryOptions, useLogOut } from '#/queries/auth'
import {
  hydrateSettings,
  setShowArchived,
  settingsStore,
} from '#/stores/settings'
import { SettingsView } from '#/features/settings/SettingsView'
import { FullPageSpinner } from '#/components/FullPageSpinner'

export const Route = createFileRoute('/settings')({ component: SettingsRoute })

function SettingsRoute() {
  const navigate = useNavigate()
  const authState = useQuery({
    ...authStateQueryOptions,
    enabled: typeof window !== 'undefined',
  })
  const logOut = useLogOut()
  const { showArchived } = useStore(settingsStore)

  useEffect(() => {
    hydrateSettings()
  }, [])

  useEffect(() => {
    const signedOut = authState.data && authState.data.status !== 'authorized'
    if (signedOut || authState.isError) void navigate({ to: '/login' })
  }, [authState.data, authState.isError, navigate])

  if (authState.data?.status !== 'authorized') return <FullPageSpinner />

  return (
    <SettingsView
      profile={authState.data.profile}
      showArchived={showArchived}
      onShowArchivedChange={setShowArchived}
      onLogOut={() => logOut.mutate()}
      logOutPending={logOut.isPending}
    />
  )
}
