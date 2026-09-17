import { TelegramClient } from '@mtcute/web'

/**
 * MTProto runs entirely in the user's browser (see docs/tz/ТЗ.md §2 "Где
 * выполняется MTProto"). The server never sees the session, phone, code or
 * 2FA password, so this file must never be imported from server-only code
 * (loaders, server functions). Calling it during SSR throws instead of
 * silently doing nothing.
 */
function assertClientOnly() {
  if (typeof window === 'undefined') {
    throw new Error(
      'src/telegram/* is client-only and must not run during SSR. ' +
        'Call it from a client effect/query, not a route loader.',
    )
  }
}

const API_ID = import.meta.env.VITE_TELEGRAM_API_ID
const API_HASH = import.meta.env.VITE_TELEGRAM_API_HASH

export const STORAGE_DB_NAME = 'telefolders'

let client: TelegramClient | undefined

export function isTelegramConfigured(): boolean {
  return Boolean(API_ID && API_HASH)
}

export function getClient(): TelegramClient {
  assertClientOnly()

  if (!API_ID || !API_HASH) {
    throw new Error(
      'VITE_TELEGRAM_API_ID / VITE_TELEGRAM_API_HASH are not set. ' +
        'Get them at https://my.telegram.org/apps and put them in .env (see .env.example).',
    )
  }

  if (!client) {
    client = new TelegramClient({
      apiId: Number(API_ID),
      apiHash: API_HASH,
      storage: STORAGE_DB_NAME,
    })
  }

  return client
}

/** Drops the in-memory client so the next `getClient()` call creates a fresh one. */
export function resetClient() {
  client = undefined
}
