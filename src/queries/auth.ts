import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import * as auth from '#/telegram/auth'
import type { AuthState } from '#/telegram/auth'

export const authStateQueryOptions = queryOptions({
  queryKey: ['auth', 'state'],
  queryFn: () => auth.getAuthState(),
  staleTime: Infinity,
})

export function useSendCode() {
  return useMutation({
    mutationFn: (phone: string) => auth.sendCode(phone),
  })
}

export function useResendCode() {
  return useMutation({
    mutationFn: ({
      phone,
      phoneCodeHash,
    }: {
      phone: string
      phoneCodeHash: string
    }) => auth.resendCode(phone, phoneCodeHash),
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
      if (result.status === 'ok') {
        const next: AuthState = {
          status: 'authorized',
          profile: result.profile,
        }
        queryClient.setQueryData(authStateQueryOptions.queryKey, next)
      }
    },
  })
}

export function useCheckPassword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (password: string) => auth.checkPassword(password),
    onSuccess: (profile) => {
      const next: AuthState = { status: 'authorized', profile }
      queryClient.setQueryData(authStateQueryOptions.queryKey, next)
    },
  })
}

/** Ends the session, wipes IndexedDB (F1.5) and drops every cached query. */
export function useLogOut() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => auth.logOut(),
    onSuccess: () => {
      queryClient.clear()
      const next: AuthState = { status: 'unauthorized' }
      queryClient.setQueryData(authStateQueryOptions.queryKey, next)
    },
  })
}
