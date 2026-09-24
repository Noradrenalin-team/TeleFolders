import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import * as auth from '#/telegram/auth'
import type { AuthState } from '#/telegram/auth'
import type { Profile } from '#/telegram/types'

export const authStateQueryOptions = queryOptions({
  queryKey: ['auth', 'state'],
  queryFn: () => auth.getAuthState(),
  staleTime: Infinity,
  // Set here, not per useQuery(): several components observe this query at
  // once and whichever registers last decides the retry policy otherwise.
  retry: 1,
})

function setAuthorized(queryClient: QueryClient, profile: Profile) {
  const next: AuthState = { status: 'authorized', profile }
  queryClient.setQueryData(authStateQueryOptions.queryKey, next)
}

/**
 * Called when the server reports the session is no longer valid
 * (`AUTH_KEY_UNREGISTERED`/`SESSION_REVOKED`, ТЗ §3) — wipes the local
 * session and every cached query so nothing keeps retrying against a dead
 * session (F9.4), then leaves the auth query in `unauthorized` so the
 * `/matrix` route's existing redirect effect sends the user to `/login`.
 */
export async function forceSignedOut(queryClient: QueryClient): Promise<void> {
  await auth.resetLocalSession()
  queryClient.clear()
  const next: AuthState = { status: 'unauthorized' }
  queryClient.setQueryData(authStateQueryOptions.queryKey, next)
}

export function useSendCode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (phone: string) => auth.sendCode(phone),
    onSuccess: (result) => {
      // `status: 'ok'`: Telegram signed the user in without a code prompt
      // (a valid future-auth token from an earlier session on this device).
      if (result.status === 'ok') setAuthorized(queryClient, result.profile)
    },
  })
}

export function useResendCode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      phone,
      phoneCodeHash,
    }: {
      phone: string
      phoneCodeHash: string
    }) => auth.resendCode(phone, phoneCodeHash),
    onSuccess: (result) => {
      if (result.status === 'ok') setAuthorized(queryClient, result.profile)
    },
  })
}

export function useSignIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      phone,
      phoneCodeHash,
      phoneCode,
    }: {
      phone: string
      phoneCodeHash: string
      phoneCode: string
    }) => auth.signIn(phone, phoneCodeHash, phoneCode),
    onSuccess: (result) => {
      if (result.status === 'ok') setAuthorized(queryClient, result.profile)
    },
  })
}

/** Text hint for the 2FA password (F1.2). Only meaningful — and only worth
 * the round-trip — once the password step is actually reached. */
export function usePasswordHint(enabled: boolean) {
  return useQuery({
    queryKey: ['auth', 'password-hint'],
    queryFn: () => auth.getPasswordHint(),
    staleTime: Infinity,
    retry: false,
    enabled,
  })
}

export function useCheckPassword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (password: string) => auth.checkPassword(password),
    onSuccess: (profile) => setAuthorized(queryClient, profile),
  })
}

/** Ends the session, wipes IndexedDB (F1.5) and drops every cached query.
 * Runs in `onSettled`, not `onSuccess`: the local session must be gone even
 * if the sign-out RPC itself fails (network drop mid-request, session
 * already revoked server-side, …) — `auth.logOut()` always wipes locally in
 * its own `finally`, so all that's left here is resetting the app's cache. */
/** Drops a half-finished sign-in (stopped at the 2FA step) so a new code
 * goes out on a clean session instead of one Telegram still holds at the
 * password step. */
export function useRestartSignIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => auth.resetLocalSession(),
    onSettled: () => {
      const next: AuthState = { status: 'unauthorized' }
      queryClient.setQueryData(authStateQueryOptions.queryKey, next)
    },
  })
}

export function useLogOut() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => auth.logOut(),
    onSettled: () => {
      queryClient.clear()
      const next: AuthState = { status: 'unauthorized' }
      queryClient.setQueryData(authStateQueryOptions.queryKey, next)
    },
  })
}
