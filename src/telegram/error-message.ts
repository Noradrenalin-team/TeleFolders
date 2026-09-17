import { normalizeError } from '#/telegram/errors'
import { m } from '#/paraglide/messages'

/** Generic, translated message for an `AppError` code (ТЗ §3). Callers can
 * special-case specific RPC texts first and fall back to this. */
export function errorMessage(error: unknown): string {
  const normalized = normalizeError(error)

  switch (normalized.code) {
    case 'FLOOD_WAIT':
      return m.error_flood_wait({ seconds: normalized.retryAfterSec ?? 0 })
    case 'FOLDER_MUST_NOT_BE_EMPTY':
      return m.error_folder_empty()
    case 'LIMIT_REACHED':
      return m.error_limit_reached()
    case 'PERMISSION_DENIED':
      return m.error_permission_denied()
    case 'AUTH_REQUIRED':
      return m.error_auth_required()
    case 'NETWORK':
      return m.error_network()
    default:
      return m.error_unknown()
  }
}
