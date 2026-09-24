import { useSyncExternalStore } from 'react'

/** Live `matchMedia` result. The server (and so the first client render)
 * always gets `false`, keeping hydration consistent; the real value
 * applies right after. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Below Tailwind's `sm` breakpoint: the matrix turns into a list (ТЗ §5). */
export const COMPACT_QUERY = '(max-width: 639px)'
