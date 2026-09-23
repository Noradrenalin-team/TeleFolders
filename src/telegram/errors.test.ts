import { describe, expect, it, vi } from 'vitest'
import { tl } from '@mtcute/web'
import {
  normalizeError,
  subscribeFloodWait,
  withFloodWaitRetry,
} from '#/telegram/errors'

function rpcError(text: string, extra: Record<string, unknown> = {}) {
  const error = new tl.RpcError(420, text)
  Object.assign(error, extra)
  return error
}

describe('normalizeError', () => {
  it('maps FLOOD_WAIT_%d to FLOOD_WAIT with the parsed seconds', () => {
    // mtcute itself rewrites FLOOD_WAIT_<n> to text "FLOOD_WAIT_%d" with a
    // `seconds` field attached (see RpcError.fromTl) — build it the same way
    // rather than assuming the raw text format.
    const error = rpcError('FLOOD_WAIT_%d', { seconds: 30 })

    expect(normalizeError(error)).toEqual({
      code: 'FLOOD_WAIT',
      retryAfterSec: 30,
      raw: 'FLOOD_WAIT_%d',
    })
  })

  it('maps FILTER_INCLUDE_EMPTY and FOLDER_MUST_NOT_BE_EMPTY to the same code (ТЗ §3)', () => {
    expect(normalizeError(rpcError('FILTER_INCLUDE_EMPTY')).code).toBe(
      'FOLDER_MUST_NOT_BE_EMPTY',
    )
    expect(normalizeError(rpcError('FOLDER_MUST_NOT_BE_EMPTY')).code).toBe(
      'FOLDER_MUST_NOT_BE_EMPTY',
    )
  })

  it('maps any *_TOO_MUCH error to LIMIT_REACHED, keeping the raw text', () => {
    const normalized = normalizeError(rpcError('PINNED_DIALOGS_TOO_MUCH'))
    expect(normalized.code).toBe('LIMIT_REACHED')
    expect(normalized.raw).toBe('PINNED_DIALOGS_TOO_MUCH')
  })

  it('maps AUTH_KEY_UNREGISTERED and SESSION_REVOKED to AUTH_REQUIRED', () => {
    expect(normalizeError(rpcError('AUTH_KEY_UNREGISTERED')).code).toBe(
      'AUTH_REQUIRED',
    )
    expect(normalizeError(rpcError('SESSION_REVOKED')).code).toBe(
      'AUTH_REQUIRED',
    )
  })

  it('maps a network-shaped Error to NETWORK', () => {
    expect(normalizeError(new Error('fetch failed')).code).toBe('NETWORK')
  })

  it('falls back to UNKNOWN, preserving the message', () => {
    const normalized = normalizeError(new Error('boom'))
    expect(normalized.code).toBe('UNKNOWN')
    expect(normalized.raw).toBe('boom')
  })
})

describe('withFloodWaitRetry', () => {
  it('waits out a short flood and retries exactly once', async () => {
    vi.useFakeTimers()
    let attempt = 0
    const fn = vi.fn(async () => {
      attempt += 1
      if (attempt === 1) throw rpcError('FLOOD_WAIT_%d', { seconds: 5 })
      return 'ok'
    })

    const promise = withFloodWaitRetry(fn)
    await vi.advanceTimersByTimeAsync(5000)

    await expect(promise).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it('reports the countdown of a silent wait to subscribers', async () => {
    vi.useFakeTimers()
    const seen: (number | undefined)[] = []
    const unsubscribe = subscribeFloodWait((left) => seen.push(left))
    let attempt = 0
    const promise = withFloodWaitRetry(async () => {
      attempt += 1
      if (attempt === 1) throw rpcError('FLOOD_WAIT_%d', { seconds: 3 })
      return 'ok'
    })
    await vi.advanceTimersByTimeAsync(3000)

    await expect(promise).resolves.toBe('ok')
    expect(seen).toEqual([3, 2, 1, undefined])
    unsubscribe()
    vi.useRealTimers()
  })

  it('re-throws a flood wait longer than 60s instead of blocking silently', async () => {
    const fn = vi.fn(async () => {
      throw rpcError('FLOOD_WAIT_%d', { seconds: 120 })
    })

    await expect(withFloodWaitRetry(fn)).rejects.toBeTruthy()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('re-throws non-flood errors immediately', async () => {
    const fn = vi.fn(async () => {
      throw rpcError('CHAT_ADMIN_REQUIRED')
    })

    await expect(withFloodWaitRetry(fn)).rejects.toBeTruthy()
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
