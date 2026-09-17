import { tl } from '@mtcute/web'
import { getClient, resetClient, STORAGE_DB_NAME } from '#/telegram/client'
import { isAuthRequiredError } from '#/telegram/errors'
import type { Profile } from '#/telegram/types'

export type AuthState =
  { status: 'unauthorized' } | { status: 'authorized'; profile: Profile }

export type SentCode = {
  phoneCodeHash: string
  nextType: string
  timeoutSec: number
}

export type SignInResult =
  { status: 'ok'; profile: Profile } | { status: 'password_needed' }

function toProfile(user: {
  id: number
  username: string | null
  firstName: string
  lastName: string | null
}): Profile {
  return {
    id: user.id,
    username: user.username ?? undefined,
    firstName: user.firstName,
    lastName: user.lastName ?? undefined,
  }
}

export async function getAuthState(): Promise<AuthState> {
  try {
    const me = await getClient().getMe()
    return { status: 'authorized', profile: toProfile(me) }
  } catch (error) {
    if (isAuthRequiredError(error)) return { status: 'unauthorized' }
    throw error
  }
}

export async function sendCode(phone: string): Promise<SentCode> {
  const result = await getClient().sendCode({ phone })

  // sendCode resolves to a `User` instead of `SentCode` when a future auth
  // token already logged the user in without a code prompt.
  if (!(result instanceof Object) || !('phoneCodeHash' in result)) {
    throw new Error(
      'Already authorized: sendCode returned a User instead of SentCode',
    )
  }

  return {
    phoneCodeHash: result.phoneCodeHash,
    nextType: result.nextType,
    timeoutSec: result.timeout,
  }
}

export async function resendCode(
  phone: string,
  phoneCodeHash: string,
): Promise<SentCode> {
  const result = await getClient().resendCode({ phone, phoneCodeHash })
  return {
    phoneCodeHash: result.phoneCodeHash,
    nextType: result.nextType,
    timeoutSec: result.timeout,
  }
}

export async function signIn(
  phone: string,
  phoneCodeHash: string,
  phoneCode: string,
): Promise<SignInResult> {
  try {
    const user = await getClient().signIn({ phone, phoneCodeHash, phoneCode })
    return { status: 'ok', profile: toProfile(user) }
  } catch (error) {
    if (tl.RpcError.is(error, 'SESSION_PASSWORD_NEEDED')) {
      return { status: 'password_needed' }
    }
    throw error
  }
}

export async function checkPassword(password: string): Promise<Profile> {
  const user = await getClient().checkPassword(password)
  return toProfile(user)
}

export async function getMe(): Promise<Profile> {
  return toProfile(await getClient().getMe())
}

/**
 * Ends the session and wipes the local IndexedDB database (F1.5). The
 * TelegramClient singleton is dropped so the next `getClient()` call opens a
 * fresh database instead of reusing an instance tied to the deleted one.
 */
export async function logOut(): Promise<void> {
  try {
    await getClient().logOut()
  } finally {
    resetClient()
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(STORAGE_DB_NAME)
      request.onsuccess = () => resolve()
      request.onerror = () => resolve()
      request.onblocked = () => resolve()
    })
  }
}
