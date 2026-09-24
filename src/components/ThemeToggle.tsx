import { useEffect } from 'react'
import { useStore } from '@tanstack/react-store'
import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from 'cn'
import { Button } from '#/components/ui/button'
import { hydrateTheme, setTheme, themeStore } from '#/stores/theme'
import type { ThemeSetting } from '#/stores/theme'
import { m } from '#/paraglide/messages'

const OPTIONS: Array<{
  value: ThemeSetting
  icon: typeof Sun
  label: () => string
}> = [
  { value: 'light', icon: Sun, label: () => m.theme_light() },
  { value: 'dark', icon: Moon, label: () => m.theme_dark() },
  { value: 'system', icon: Monitor, label: () => m.theme_system() },
]

export function ThemeToggle() {
  const current = useStore(themeStore)

  useEffect(() => {
    hydrateTheme()
  }, [])

  return (
    <div
      role="group"
      aria-label={m.theme_label()}
      className="inline-flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5"
    >
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <Button
          key={value}
          type="button"
          variant={current === value ? 'secondary' : 'ghost'}
          size="icon-sm"
          aria-pressed={current === value}
          aria-label={label()}
          title={label()}
          onClick={() => setTheme(value)}
          className={cn(current === value && 'shadow-xs')}
        >
          <Icon aria-hidden="true" />
        </Button>
      ))}
    </div>
  )
}
