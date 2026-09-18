import { Store } from '@tanstack/store'

const STORAGE_KEY = 'telefolders.settings'

export interface PersistedSettings {
  /** F3.3: "Показывать архивные" — persisted so it survives navigating away
   * from `/matrix` and back, not just within one URL's search params. */
  showArchived: boolean
}

const DEFAULT_SETTINGS: PersistedSettings = { showArchived: false }

function readStorage(): PersistedSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<PersistedSettings>
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return DEFAULT_SETTINGS
  }
}

// Server and the first client render must agree (see stores/theme.ts for the
// same reasoning), so this always starts at the default; `hydrateSettings()`
// applies the real, localStorage-backed value post-hydration.
export const settingsStore = new Store<PersistedSettings>(DEFAULT_SETTINGS)

let hydrated = false

/** Call once on the client, after mount, to sync the store with localStorage. */
export function hydrateSettings(): void {
  if (hydrated || typeof window === 'undefined') return
  hydrated = true
  settingsStore.setState(() => readStorage())
}

/** Reads the persisted value directly, without going through the (possibly
 * not-yet-hydrated) store — for one-off reads before the first render, e.g.
 * the `/` → `/matrix` redirect picking an initial `archived` search param. */
export function readPersistedShowArchived(): boolean {
  return readStorage().showArchived
}

export function setShowArchived(showArchived: boolean): void {
  settingsStore.setState((state) => ({ ...state, showArchived }))
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(settingsStore.state),
    )
  } catch {
    // Storage can be unavailable (private browsing, quota) — the setting
    // just won't survive a reload, which is a harmless degradation.
  }
}
