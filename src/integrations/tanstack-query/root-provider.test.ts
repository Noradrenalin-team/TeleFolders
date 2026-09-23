import { beforeEach, describe, expect, it, vi } from 'vitest'
import { tl } from '@mtcute/web'
import { getContext } from '#/integrations/tanstack-query/root-provider'
import { authStateQueryOptions } from '#/queries/auth'

const auth = vi.hoisted(() => ({ resetLocalSession: vi.fn() }))
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))

vi.mock('#/telegram/auth', () => auth)
vi.mock('sonner', () => ({ toast }))

beforeEach(() => {
  auth.resetLocalSession.mockReset().mockResolvedValue(undefined)
  toast.error.mockReset()
})

describe('session loss (F9.4)', () => {
  it('signs out softly when any query hits AUTH_KEY_UNREGISTERED', async () => {
    const { queryClient } = getContext()
    queryClient.setQueryData(['dialogs'], ['stale chats'])

    await queryClient
      .fetchQuery({
        queryKey: ['folders'],
        queryFn: () =>
          Promise.reject(new tl.RpcError(401, 'AUTH_KEY_UNREGISTERED')),
        retry: false,
      })
      .catch(() => undefined)

    await vi.waitFor(() =>
      expect(queryClient.getQueryData(authStateQueryOptions.queryKey)).toEqual({
        status: 'unauthorized',
      }),
    )
    expect(auth.resetLocalSession).toHaveBeenCalled()
    // The previous account's data doesn't survive into the next session.
    expect(queryClient.getQueryData(['dialogs'])).toBeUndefined()
    expect(toast.error).toHaveBeenCalled()
  })

  it('leaves the session alone for an ordinary error', async () => {
    const { queryClient } = getContext()

    await queryClient
      .fetchQuery({
        queryKey: ['folders'],
        queryFn: () => Promise.reject(new tl.RpcError(400, 'PEER_ID_INVALID')),
        retry: false,
      })
      .catch(() => undefined)

    expect(auth.resetLocalSession).not.toHaveBeenCalled()
  })
})
