import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runQueue } from '#/features/bulk/run-queue'

class Flood extends Error {
  constructor(readonly seconds: number) {
    super('FLOOD_WAIT')
  }
}

const retryAfterSec = (error: unknown) =>
  error instanceof Flood ? error.seconds : undefined

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('runQueue', () => {
  it('runs items sequentially and reports progress', async () => {
    const order: number[] = []
    const progress: number[] = []
    const result = await runQueue(
      [1, 2, 3],
      async (n) => {
        order.push(n)
      },
      {
        signal: new AbortController().signal,
        retryAfterSec,
        onProgress: (p) => progress.push(p.done),
      },
    )

    expect(order).toEqual([1, 2, 3])
    expect(progress).toEqual([0, 1, 2, 3])
    expect(result).toEqual({ succeeded: [1, 2, 3], failed: [], cancelled: [] })
  })

  it('records a failure and keeps going', async () => {
    const boom = new Error('PEER_ID_INVALID')
    const result = await runQueue(
      [1, 2, 3],
      async (n) => {
        if (n === 2) throw boom
      },
      { signal: new AbortController().signal, retryAfterSec },
    )

    expect(result.succeeded).toEqual([1, 3])
    expect(result.failed).toEqual([{ item: 2, error: boom }])
  })

  it('pauses on FLOOD_WAIT and retries the same item', async () => {
    let calls = 0
    const waits: number[] = []
    const run = runQueue(
      ['a'],
      async () => {
        calls++
        if (calls === 1) throw new Flood(2)
      },
      {
        signal: new AbortController().signal,
        retryAfterSec,
        onProgress: (p) => {
          if (p.waitingSec) waits.push(p.waitingSec)
        },
      },
    )
    await vi.runAllTimersAsync()

    expect(await run).toEqual({ succeeded: ['a'], failed: [], cancelled: [] })
    expect(calls).toBe(2)
    expect(waits).toEqual([2, 1])
  })

  it('gives up on an item after repeated FLOOD_WAITs', async () => {
    const run = runQueue(
      ['a'],
      async () => {
        throw new Flood(1)
      },
      { signal: new AbortController().signal, retryAfterSec },
    )
    await vi.runAllTimersAsync()

    const result = await run
    expect(result.failed).toHaveLength(1)
  })

  it('stops before the next item when cancelled', async () => {
    const controller = new AbortController()
    const result = await runQueue(
      [1, 2, 3],
      async (n) => {
        if (n === 1) controller.abort()
      },
      { signal: controller.signal, retryAfterSec },
    )

    expect(result).toEqual({ succeeded: [1], failed: [], cancelled: [2, 3] })
  })

  it('cancels during a FLOOD_WAIT pause without retrying', async () => {
    const controller = new AbortController()
    let calls = 0
    const run = runQueue(
      [1, 2],
      async () => {
        calls++
        throw new Flood(30)
      },
      { signal: controller.signal, retryAfterSec },
    )
    await vi.advanceTimersByTimeAsync(1500)
    controller.abort()
    await vi.runAllTimersAsync()

    expect(await run).toEqual({ succeeded: [], failed: [], cancelled: [1, 2] })
    expect(calls).toBe(1)
  })
})
