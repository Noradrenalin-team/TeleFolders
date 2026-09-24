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

/**
 * Drops the client and permanently deletes its local IndexedDB database.
 * Used whenever the session must not be reused: explicit sign-out (F1.5) or
 * the server reporting it's already invalid (`AUTH_REQUIRED`, ТЗ §3).
 *
 * The client is `destroy()`-ed (not just dropped) before the database is
 * deleted: mtcute's `IdbStorageDriver` keeps an open `IDBDatabase` connection
 * for as long as the client is alive, and `indexedDB.deleteDatabase` blocks
 * forever waiting for every open connection to close first — so without this,
 * the delete request would sit in `onblocked`, and a fresh `getClient()` call
 * right after would open the very database that's still pending deletion.
 */
export async function wipeLocalSession(): Promise<void> {
  const current = client
  client = undefined

  if (current) {
    await current.destroy().catch(() => undefined)
  }

  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(STORAGE_DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => resolve()
    request.onblocked = () => resolve()
  })
}
