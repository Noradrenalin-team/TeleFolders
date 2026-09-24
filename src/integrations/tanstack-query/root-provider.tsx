import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { isAuthRequiredError } from '#/telegram/errors'
import { errorMessage } from '#/telegram/error-message'
import { forceSignedOut } from '#/queries/auth'

export function getContext() {
  // `onCacheError` closes over `queryClient`, declared further down — safe
  // because the cache callbacks only ever fire later, once a query or
  // mutation actually runs, by which point `queryClient` is long since
  // initialized (unlike a plain top-to-bottom read, a closure's body isn't
  // evaluated until it's called).
  const onCacheError = (error: unknown) => {
    // F9.4 / ТЗ §3: the server telling us the session itself is dead
    // (AUTH_KEY_UNREGISTERED, SESSION_REVOKED) is not "this one query
    // failed" — every other query/mutation using the same session is about
    // to fail the same way, so it's handled centrally here instead of in
    // each hook's own onError.
    if (!isAuthRequiredError(error)) return
    void forceSignedOut(queryClient).then(() => {
      toast.error(errorMessage(error))
    })
  }

  const queryClient = new QueryClient({
    queryCache: new QueryCache({ onError: onCacheError }),
    mutationCache: new MutationCache({ onError: onCacheError }),
  })

  return {
    queryClient,
  }
}
export default function TanstackQueryProvider() {}
