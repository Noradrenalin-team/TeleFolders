import { Link } from '@tanstack/react-router'
import { ChevronRight, ExternalLink, Loader2, LogOut } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'
import ParaglideLocaleSwitcher from '#/components/LocaleSwitcher'
import { ThemeToggle } from '#/components/ThemeToggle'
import { APP_VERSION, REPOSITORY_URL } from '#/lib/app-info'
import type { Profile } from '#/telegram/types'
import { m } from '#/paraglide/messages'

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {children}
      </div>
    </section>
  )
}

function Row({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 px-4 py-2 text-sm">
      {htmlFor ? (
        <Label htmlFor={htmlFor}>{label}</Label>
      ) : (
        <span>{label}</span>
      )}
      {children}
    </div>
  )
}

/** `/settings` (F8): language, theme, archive visibility, blocked users,
 * account and "about". Pure — the route supplies state and actions. */
export function SettingsView({
  profile,
  showArchived,
  onShowArchivedChange,
  onLogOut,
  logOutPending = false,
}: {
  profile?: Profile
  showArchived: boolean
  onShowArchivedChange: (value: boolean) => void
  onLogOut: () => void
  logOutPending?: boolean
}) {
  const name = profile
    ? [profile.firstName, profile.lastName].filter(Boolean).join(' ')
    : ''

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8 px-4 py-6">
      <h1 className="text-lg font-semibold">{m.settings_title()}</h1>

      <Section title={m.settings_section_interface()}>
        <Row label={m.language_label()}>
          <ParaglideLocaleSwitcher />
        </Row>
        <Row label={m.theme_label()}>
          <ThemeToggle />
        </Row>
        <Row label={m.settings_show_archived()} htmlFor="settings-archived">
          <Switch
            id="settings-archived"
            checked={showArchived}
            onCheckedChange={onShowArchivedChange}
          />
        </Row>
      </Section>

      <Section title={m.settings_section_account()}>
        {profile && (
          <Row label={name}>
            {profile.username && (
              <span className="text-muted-foreground">@{profile.username}</span>
            )}
          </Row>
        )}
        <Link
          to="/blocked"
          className="flex min-h-12 items-center justify-between px-4 py-2 text-sm hover:bg-accent"
        >
          {m.nav_blocked()}
          <ChevronRight
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
        </Link>
        <div className="px-4 py-3">
          <Button
            type="button"
            variant="outline"
            disabled={logOutPending}
            onClick={onLogOut}
          >
            {logOutPending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <LogOut aria-hidden="true" />
            )}
            {m.nav_logout()}
          </Button>
        </div>
      </Section>

      <Section title={m.about_title()}>
        <Row label={m.about_version()}>
          <span className="font-mono text-muted-foreground">{APP_VERSION}</span>
        </Row>
        <a
          href={REPOSITORY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 items-center justify-between px-4 py-2 text-sm hover:bg-accent"
        >
          {m.about_repository()}
          <ExternalLink
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
        </a>
        <p className="px-4 py-3 text-sm text-muted-foreground">
          {m.login_disclaimer()} {m.about_unofficial()}
        </p>
      </Section>
    </div>
  )
}
