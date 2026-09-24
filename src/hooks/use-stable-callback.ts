import { useCallback, useLayoutEffect, useRef } from 'react'

/**
 * A callback with a stable identity that always calls the latest `fn` —
 * for handing parent callbacks (often inline arrows) to memoized children
 * without re-rendering them every time the parent does. Stays `undefined`
 * while `fn` is, since several components read "no handler" as "disabled".
 */
export function useStableCallback<TArgs extends unknown[], TResult>(
  fn: ((...args: TArgs) => TResult) | undefined,
): ((...args: TArgs) => TResult) | undefined {
  const latest = useRef(fn)
  useLayoutEffect(() => {
    latest.current = fn
  })
  const stable = useCallback((...args: TArgs) => latest.current!(...args), [])
  return fn ? stable : undefined
}
