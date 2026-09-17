import { useQuery } from '@tanstack/react-query'
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
        <span className="text-sm font-semibold tracking-tight">
          {m.app_title()}
        </span>
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
