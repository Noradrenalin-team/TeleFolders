import { tl } from '@mtcute/web'

export type AppErrorCode =
  | 'FOLDER_MUST_NOT_BE_EMPTY'
  | 'FLOOD_WAIT'
  | 'LIMIT_REACHED'
  | 'AUTH_REQUIRED'
  | 'NETWORK'
  | 'PERMISSION_DENIED'
  | 'UNKNOWN'

export type AppError = {
  code: AppErrorCode
  retryAfterSec?: number
  /** Original RPC error text, always kept for support/debugging. */
  raw: string
}

const AUTH_REQUIRED_CODES = ['AUTH_KEY_UNREGISTERED', 'SESSION_REVOKED']
const PERMISSION_DENIED_CODES = [
  'CHAT_ADMIN_REQUIRED',
  'USER_PRIVACY_RESTRICTED',
  'CHANNEL_PRIVATE',
]
const LIMIT_CODES_SUFFIX = '_TOO_MUCH'

export function isAuthRequiredError(error: unknown): boolean {
  return tl.RpcError.is(error) && AUTH_REQUIRED_CODES.includes(error.text)
}

export function normalizeError(error: unknown): AppError {
  if (tl.RpcError.is(error)) {
    const raw = error.text

    if (tl.RpcError.is(error, 'FLOOD_WAIT_%d')) {
      return { code: 'FLOOD_WAIT', retryAfterSec: error.seconds, raw }
    }
    if (raw === 'FOLDER_MUST_NOT_BE_EMPTY' || raw === 'FILTER_INCLUDE_EMPTY') {
      return { code: 'FOLDER_MUST_NOT_BE_EMPTY', raw }
    }
    if (raw === 'FILTERS_TOO_MUCH' || raw.endsWith(LIMIT_CODES_SUFFIX)) {
      return { code: 'LIMIT_REACHED', raw }
    }
    if (AUTH_REQUIRED_CODES.includes(raw)) {
      return { code: 'AUTH_REQUIRED', raw }
    }
    if (PERMISSION_DENIED_CODES.includes(raw)) {
      return { code: 'PERMISSION_DENIED', raw }
    }
    return { code: 'UNKNOWN', raw }
  }

  if (error instanceof Error) {
    if (
      error.name === 'MtTimeoutError' ||
      /network|fetch|websocket/i.test(error.message)
    ) {
      return { code: 'NETWORK', raw: error.message }
    }
    return { code: 'UNKNOWN', raw: error.message }
  }

  return { code: 'UNKNOWN', raw: String(error) }
}

type FloodWaitListener = (secondsLeft: number | undefined) => void
const floodWaitListeners = new Set<FloodWaitListener>()

/**
 * Lets the UI see the otherwise silent pauses `withFloodWaitRetry` makes:
 * called with the seconds left once per second during a wait, then with
 * `undefined` when it's over. Returns an unsubscribe function.
 */
export function subscribeFloodWait(listener: FloodWaitListener): () => void {
  floodWaitListeners.add(listener)
  return () => floodWaitListeners.delete(listener)
}

function notifyFloodWait(secondsLeft: number | undefined): void {
  for (const listener of floodWaitListeners) listener(secondsLeft)
}

/**
 * Transparent FLOOD_WAIT handling (ТЗ §3): waits out short floods and retries
 * once. Longer waits (> 60s) are re-thrown so the caller can show a timer
 * instead of silently blocking the UI.
 */
export async function withFloodWaitRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    const normalized = normalizeError(error)
    const retryAfterSec = normalized.retryAfterSec
    if (normalized.code !== 'FLOOD_WAIT' || retryAfterSec === undefined) {
      throw error
    }
    if (retryAfterSec > 60) {
      throw error
    }
    try {
      for (let left = retryAfterSec; left > 0; left--) {
        notifyFloodWait(left)
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    } finally {
      notifyFloodWait(undefined)
    }
    return fn()
  }
}
