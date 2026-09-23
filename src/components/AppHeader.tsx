import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { DEFAULT_MATRIX_SEARCH } from '#/features/matrix/filters'
import { LogOut } from 'lucide-react'
import { m } from '#/paraglide/messages'
import ParaglideLocaleSwitcher from '#/components/LocaleSwitcher'
import { ThemeToggle } from '#/components/ThemeToggle'
import { Button } from '#/components/ui/button'
import { authStateQueryOptions, useLogOut } from '#/queries/auth'

export function AppHeader() {
  const authState = useQuery({
    ...authStateQueryOptions,
    enabled: typeof window !== 'undefined',
  })
  const logOut = useLogOut()
  const isAuthorized = authState.data?.status === 'authorized'

  return (
    <header className="border-b border-border bg-background">
      <div className="flex h-14 items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold tracking-tight">
            {m.app_title()}
          </span>
          {isAuthorized && (
            // A segmented switch, so the current section reads at a glance.
            // Colours live only in active/inactive props: combined with a
            // base colour class, Tailwind's CSS order decided which won.
            <nav
              aria-label={m.nav_sections()}
              className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5 text-sm"
            >
              <Link
                to="/matrix"
                search={DEFAULT_MATRIX_SEARCH}
                // Active on /matrix with any filters in the URL, not only
                // with the default search this link points to.
                activeOptions={{ includeSearch: false }}
                className="rounded-md px-3 py-1 transition-colors"
                activeProps={{
                  className:
                    'bg-background font-medium text-foreground shadow-sm',
                }}
                inactiveProps={{
                  className: 'text-foreground/70 hover:text-foreground',
                }}
              >
                {m.nav_matrix()}
              </Link>
              <Link
                to="/blocked"
                className="rounded-md px-3 py-1 transition-colors"
                activeProps={{
                  className:
                    'bg-background font-medium text-foreground shadow-sm',
                }}
                inactiveProps={{
                  className: 'text-foreground/70 hover:text-foreground',
                }}
              >
                {m.nav_blocked()}
              </Link>
            </nav>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ParaglideLocaleSwitcher />
          <ThemeToggle />
          {isAuthorized && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={m.nav_logout()}
              title={m.nav_logout()}
              disabled={logOut.isPending}
              onClick={() => logOut.mutate()}
            >
              <LogOut aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
