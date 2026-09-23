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
      // `PINNED_DIALOGS_TOO_MUCH` also normalizes to LIMIT_REACHED (any
      // `*_TOO_MUCH` RPC error does, ТЗ §3) but reads better with a message
      // that names what's actually full (F5.2).
      if (normalized.raw === 'PINNED_DIALOGS_TOO_MUCH') {
        return m.error_pinned_limit()
      }
      return m.error_limit_reached()
    case 'PERMISSION_DENIED':
      return m.error_permission_denied()
    case 'AUTH_REQUIRED':
      return m.error_auth_required()
    case 'NETWORK':
      return m.error_network()
    default:
      if (normalized.raw === 'USER_CREATOR') return m.error_owner_cannot_leave()
      return m.error_unknown()
  }
}
