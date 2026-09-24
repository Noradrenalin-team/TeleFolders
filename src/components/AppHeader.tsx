import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import { Ban, ChevronDown, LogOut, RefreshCw, Settings } from 'lucide-react'
import { matrixEntrySearch } from '#/features/matrix/filters'
import { hydrateSettings, settingsStore } from '#/stores/settings'
import { m } from '#/paraglide/messages'
import ParaglideLocaleSwitcher from '#/components/LocaleSwitcher'
import { ThemeToggle } from '#/components/ThemeToggle'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { authStateQueryOptions, useLogOut } from '#/queries/auth'
import { useChatPhoto, dialogsQueryOptions } from '#/queries/dialogs'
import { foldersQueryOptions } from '#/queries/folders'
import { blockedQueryOptions } from '#/queries/actions'
import type { Profile } from '#/telegram/types'

// Colours live only in active/inactive props: combined with a base colour
// class, Tailwind's CSS order decided which one won.
const TAB_CLASS = 'rounded-md px-3 py-1 transition-colors'
const TAB_ACTIVE = {
  className: 'bg-background font-medium text-foreground shadow-sm',
}
const TAB_INACTIVE = {
  className: 'text-foreground/70 hover:text-foreground',
}

export function AppHeader() {
  const authState = useQuery({
    ...authStateQueryOptions,
    enabled: typeof window !== 'undefined',
  })
  const { showArchived } = useStore(settingsStore)
  const profile =
    authState.data?.status === 'authorized' ? authState.data.profile : undefined

  useEffect(() => {
    hydrateSettings()
  }, [])

  return (
    <header className="border-b border-border bg-background">
      <div className="flex h-14 items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold tracking-tight">
            {m.app_title()}
          </span>
          {profile && (
            // A segmented switch, so the current section reads at a glance.
            <nav
              aria-label={m.nav_sections()}
              className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5 text-sm"
            >
              <Link
                to="/matrix"
                search={matrixEntrySearch(showArchived)}
                // Active on /matrix with any filters in the URL, not only
                // with the entry search this link points to.
                activeOptions={{ includeSearch: false }}
                className={TAB_CLASS}
                activeProps={TAB_ACTIVE}
                inactiveProps={TAB_INACTIVE}
              >
                {m.nav_matrix()}
              </Link>
              <Link
                to="/blocked"
                className={TAB_CLASS}
                activeProps={TAB_ACTIVE}
                inactiveProps={TAB_INACTIVE}
              >
                {m.nav_blocked()}
              </Link>
              <Link
                to="/settings"
                className={TAB_CLASS}
                activeProps={TAB_ACTIVE}
                inactiveProps={TAB_INACTIVE}
              >
                {m.nav_settings()}
              </Link>
            </nav>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ParaglideLocaleSwitcher />
          <ThemeToggle />
          {profile && <ProfileMenu profile={profile} />}
        </div>
      </div>
    </header>
  )
}

/** F8.3: avatar, name and @username, with the account actions. */
function ProfileMenu({ profile }: { profile: Profile }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const logOut = useLogOut()
  const photo = useChatPhoto({ id: profile.id, kind: 'saved' })
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-2 px-1.5"
          aria-label={m.profile_menu()}
        >
          <span className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-medium">
            {photo.data ? (
              <img src={photo.data} alt="" className="size-full object-cover" />
            ) : (
              name.charAt(0).toUpperCase()
            )}
          </span>
          <span className="hidden max-w-32 truncate sm:inline">{name}</span>
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="px-2 py-1.5 text-sm">
          <p className="truncate font-medium">{name}</p>
          {profile.username && (
            <p className="truncate text-xs text-muted-foreground">
              @{profile.username}
            </p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void navigate({ to: '/settings' })}>
          <Settings aria-hidden="true" />
          {m.nav_settings()}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            for (const queryKey of [
              foldersQueryOptions.queryKey,
              dialogsQueryOptions.queryKey,
              blockedQueryOptions.queryKey,
            ]) {
              void queryClient.invalidateQueries({ queryKey })
            }
          }}
        >
          <RefreshCw aria-hidden="true" />
          {m.nav_refresh()}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void navigate({ to: '/blocked' })}>
          <Ban aria-hidden="true" />
          {m.nav_blocked()}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={logOut.isPending}
          onSelect={() => logOut.mutate()}
        >
          <LogOut aria-hidden="true" />
          {m.nav_logout()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
