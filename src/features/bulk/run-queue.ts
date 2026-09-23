export type QueueProgress = {
  done: number
  total: number
  /** Seconds left in a FLOOD_WAIT pause, if one is in progress. */
  waitingSec?: number
}

export type QueueResult<T> = {
  succeeded: T[]
  failed: { item: T; error: unknown }[]
  /** Never started because the run was cancelled. */
  cancelled: T[]
}

const MAX_FLOOD_RETRIES = 3

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve()
    const timer = setTimeout(done, ms)
    signal.addEventListener('abort', done, { once: true })
    function done() {
      clearTimeout(timer)
      signal.removeEventListener('abort', done)
      resolve()
    }
  })
}

/**
 * Runs `worker` over `items` one at a time (F6.3). A FLOOD_WAIT pauses the
 * run and retries the same item instead of failing it; any other error is
 * recorded and the run moves on. Cancelling stops before the next item —
 * the one in flight is allowed to finish, since a half-sent RPC can't be
 * taken back anyway.
 */
export async function runQueue<T>(
  items: readonly T[],
  worker: (item: T) => Promise<void>,
  {
    signal,
    onProgress,
    retryAfterSec,
  }: {
    signal: AbortSignal
    onProgress?: (progress: QueueProgress) => void
    /** FLOOD_WAIT seconds for this error, or undefined for any other error. */
    retryAfterSec: (error: unknown) => number | undefined
  },
): Promise<QueueResult<T>> {
  const result: QueueResult<T> = { succeeded: [], failed: [], cancelled: [] }
  const total = items.length
  // A function, not the property: TS narrows `signal.aborted` after one
  // check and can't see it flip during the `await`s below.
  const aborted = () => signal.aborted
  onProgress?.({ done: 0, total })

  for (const [index, item] of items.entries()) {
    if (aborted()) {
      result.cancelled.push(...items.slice(index))
      break
    }

    for (let attempt = 0; ; attempt++) {
      try {
        await worker(item)
        result.succeeded.push(item)
        break
      } catch (error) {
        const wait = retryAfterSec(error)
        if (wait === undefined || attempt >= MAX_FLOOD_RETRIES) {
          result.failed.push({ item, error })
          break
        }
        for (let left = wait; left > 0 && !aborted(); left--) {
          onProgress?.({ done: index, total, waitingSec: left })
          await sleep(1000, signal)
        }
        if (aborted()) {
          result.cancelled.push(item)
          break
        }
      }
    }

    onProgress?.({ done: index + 1, total })
  }

  return result
}
