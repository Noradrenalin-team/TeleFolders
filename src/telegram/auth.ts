import { tl } from '@mtcute/web'
import type {
  SentCode as MtcuteSentCode,
  User as MtcuteUser,
} from '@mtcute/web'
import { getClient, wipeLocalSession } from '#/telegram/client'
import { clearPhotoCache } from '#/telegram/dialogs'
import { isAuthRequiredError } from '#/telegram/errors'
import type { Profile } from '#/telegram/types'

export type AuthState =
  { status: 'unauthorized' } | { status: 'authorized'; profile: Profile }

export type SentCode = {
  phoneCodeHash: string
  nextType: string
  timeoutSec: number
}

/**
 * `sendCode`/`resendCode` normally hand back a code prompt, but Telegram can
 * also sign the user in immediately without one (`auth.sentCodeSuccess`,
 * e.g. a valid future-auth token from a previous session on this device) —
 * `status: 'ok'` is that case.
 */
export type SentCodeResult =
  { status: 'code'; sentCode: SentCode } | { status: 'ok'; profile: Profile }

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

function toSentCodeResult(result: MtcuteSentCode | MtcuteUser): SentCodeResult {
  if ('phoneCodeHash' in result) {
    return {
      status: 'code',
      sentCode: {
        phoneCodeHash: result.phoneCodeHash,
        nextType: result.nextType,
        timeoutSec: result.timeout,
      },
    }
  }

  // `auth.sentCodeSuccess`: mtcute resolves `sendCode` to a `User` instead of
  // a `SentCode` in this case, meaning the user is already signed in — not
  // an error (ТЗ §3).
  return { status: 'ok', profile: toProfile(result) }
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

export async function sendCode(phone: string): Promise<SentCodeResult> {
  const result = await getClient().sendCode({ phone })
  return toSentCodeResult(result)
}

export async function resendCode(
  phone: string,
  phoneCodeHash: string,
): Promise<SentCodeResult> {
  const result = await getClient().resendCode({ phone, phoneCodeHash })
  return toSentCodeResult(result)
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

/** Text hint for the 2FA password (F1.2), if the user set one. `undefined`
 * when there's no hint, not when the password itself is unknown. */
export async function getPasswordHint(): Promise<string | undefined> {
  const client = getClient()
  const password = await client.call({ _: 'account.getPassword' })
  return password.hint
}

export async function checkPassword(password: string): Promise<Profile> {
  const user = await getClient().checkPassword(password)
  return toProfile(user)
}

export async function getMe(): Promise<Profile> {
  return toProfile(await getClient().getMe())
}

/**
 * Resets the local session without calling the server (ТЗ §3): used when the
 * server has already invalidated it (`AUTH_KEY_UNREGISTERED`,
 * `SESSION_REVOKED`) and calling `logOut()` would just fail the same way.
 */
export async function resetLocalSession(): Promise<void> {
  await wipeLocalSession()
  clearPhotoCache()
}

/** Ends the session and wipes the local IndexedDB database + cached avatars
 * (F1.5). The local wipe always runs, even if the server call fails, so a
 * broken connection can't leave the old session sitting on disk. */
export async function logOut(): Promise<void> {
  try {
    await getClient().logOut()
  } finally {
    await resetLocalSession()
  }
}
