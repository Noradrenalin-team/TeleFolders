import { normalizeError } from '#/telegram/errors'
import { errorMessage } from '#/telegram/error-message'
import { m } from '#/paraglide/messages'

/** Maps a caught auth-flow error to a translated, user-facing message (F1.2). */
export function authErrorMessage(error: unknown): string {
  const normalized = normalizeError(error)

  switch (normalized.raw) {
    case 'PHONE_NUMBER_INVALID':
      return m.auth_error_phone_invalid()
    case 'PHONE_NUMBER_BANNED':
      return m.auth_error_phone_banned()
    case 'PHONE_CODE_INVALID':
      return m.auth_error_code_invalid()
    case 'PHONE_CODE_EXPIRED':
      return m.auth_error_code_expired()
    case 'PASSWORD_HASH_INVALID':
      return m.auth_error_password_invalid()
    case 'SEND_CODE_UNAVAILABLE':
      return m.auth_error_send_code_unavailable()
    case 'PHONE_NUMBER_FLOOD':
      return m.auth_error_phone_flood()
    default:
      return errorMessage(error)
  }
}
