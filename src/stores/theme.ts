import { Store } from '@tanstack/store'

export type ThemeSetting = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'telefolders.theme'

function resolveTheme(setting: ThemeSetting): 'light' | 'dark' {
  if (setting !== 'system') return setting
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function applyTheme(setting: ThemeSetting) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle(
    'dark',
    resolveTheme(setting) === 'dark',
  )
}

// Server and the first client render must agree, so this always starts as
// 'system'; the real, localStorage-backed value is applied post-hydration by
// `hydrateTheme` (see useThemeHydration). Otherwise React would hydrate
// against a value that differs from what the server sent down.
export const themeStore = new Store<ThemeSetting>('system')

export function setTheme(setting: ThemeSetting) {
  themeStore.setState(() => setting)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, setting)
  }
  applyTheme(setting)
}

let hydrated = false

/** Call once on the client, after mount, to sync the store with localStorage. */
export function hydrateTheme() {
  if (hydrated || typeof window === 'undefined') return
  hydrated = true

  const stored = window.localStorage.getItem(STORAGE_KEY)
  const setting: ThemeSetting =
    stored === 'light' || stored === 'dark' ? stored : 'system'
  themeStore.setState(() => setting)
  applyTheme(setting)

  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      if (themeStore.state === 'system') applyTheme('system')
    })
}

/** Inline, blocking script: sets the `dark` class before first paint to avoid a flash. */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});var d=s==='dark'||(s!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`
