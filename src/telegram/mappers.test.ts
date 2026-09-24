import { describe, expect, it } from 'vitest'
import { Long } from '@mtcute/web'
import type { tl } from '@mtcute/web'
import {
  computeChatFolders,
  mapFilterToFolder,
  peerKey,
} from '#/telegram/mappers'

const SELF_ID = 111

function textWithEntities(text: string): tl.RawTextWithEntities {
  return { _: 'textWithEntities', text, entities: [] }
}

function baseFilter(
  overrides: Partial<tl.RawDialogFilter> = {},
): tl.RawDialogFilter {
  return {
    _: 'dialogFilter',
    id: 2,
    title: textWithEntities('Work'),
    pinnedPeers: [],
    includePeers: [],
    excludePeers: [],
    ...overrides,
  }
}

describe('peerKey', () => {
  it('returns the marked id for a plain user/chat/channel peer', () => {
    expect(
      peerKey({ _: 'inputPeerUser', userId: 42, accessHash: Long.ZERO }),
    ).toBe(42)
    expect(peerKey({ _: 'inputPeerChat', chatId: 5 })).toBe(-5)
    expect(
      peerKey({ _: 'inputPeerChannel', channelId: 7, accessHash: Long.ZERO }),
    ).toBe(-1000000000007)
  })

  it('resolves inputPeerSelf to the given selfId', () => {
    expect(peerKey({ _: 'inputPeerSelf' }, SELF_ID)).toBe(SELF_ID)
  })

  it('returns undefined for inputPeerSelf without a selfId, instead of throwing', () => {
    expect(peerKey({ _: 'inputPeerSelf' })).toBeUndefined()
  })

  it('returns undefined for inputPeerEmpty', () => {
    expect(peerKey({ _: 'inputPeerEmpty' })).toBeUndefined()
  })
})

describe('computeChatFolders', () => {
  it('reports pinned when a peer is in both pinnedPeers and includePeers (ТЗ §3.3)', () => {
    const peer: tl.TypeInputPeer = {
      _: 'inputPeerUser',
      userId: 1,
      accessHash: Long.ZERO,
    }
    const filters: tl.TypeDialogFilter[] = [
      baseFilter({ id: 2, pinnedPeers: [peer], includePeers: [peer] }),
    ]

    expect(computeChatFolders(1, filters, undefined)).toEqual({ 2: 'pinned' })
  })

  it('reports include when only in includePeers', () => {
    const peer: tl.TypeInputPeer = {
      _: 'inputPeerUser',
      userId: 1,
      accessHash: Long.ZERO,
    }
    const filters: tl.TypeDialogFilter[] = [
      baseFilter({ id: 2, includePeers: [peer] }),
    ]

    expect(computeChatFolders(1, filters, undefined)).toEqual({ 2: 'include' })
  })

  it('reports exclude when only in excludePeers', () => {
    const peer: tl.TypeInputPeer = {
      _: 'inputPeerUser',
      userId: 1,
      accessHash: Long.ZERO,
    }
    const filters: tl.TypeDialogFilter[] = [
      baseFilter({ id: 2, excludePeers: [peer] }),
    ]

    expect(computeChatFolders(1, filters, undefined)).toEqual({ 2: 'exclude' })
  })

  it('skips the default filter and leaves unrelated folders out entirely', () => {
    const filters: tl.TypeDialogFilter[] = [
      { _: 'dialogFilterDefault' },
      baseFilter({ id: 2 }),
    ]

    expect(computeChatFolders(1, filters, undefined)).toEqual({})
  })

  it('resolves an inputPeerSelf entry against the given selfId', () => {
    const filters: tl.TypeDialogFilter[] = [
      baseFilter({ id: 2, includePeers: [{ _: 'inputPeerSelf' }] }),
    ]

    expect(computeChatFolders(SELF_ID, filters, SELF_ID)).toEqual({
      2: 'include',
    })
  })
})

describe('mapFilterToFolder', () => {
  it('counts includeCount as the union of include and pinned, not their sum (ТЗ §3.4)', () => {
    const shared: tl.TypeInputPeer = {
      _: 'inputPeerUser',
      userId: 1,
      accessHash: Long.ZERO,
    }
    const onlyIncluded: tl.TypeInputPeer = {
      _: 'inputPeerUser',
      userId: 2,
      accessHash: Long.ZERO,
    }
    const filter = baseFilter({
      pinnedPeers: [shared],
      includePeers: [onlyIncluded],
    })

    const folder = mapFilterToFolder(filter, undefined)

    expect(folder.includeCount).toBe(2)
    expect(folder.pinnedCount).toBe(1)
  })

  it('marks a chatlist filter as read-only with empty flags', () => {
    const chatlist: tl.RawDialogFilterChatlist = {
      _: 'dialogFilterChatlist',
      id: 4,
      title: textWithEntities('Shared'),
      pinnedPeers: [],
      includePeers: [{ _: 'inputPeerUser', userId: 1, accessHash: Long.ZERO }],
    }

    const folder = mapFilterToFolder(chatlist, undefined)

    expect(folder.readOnly).toBe(true)
    expect(folder.excludeCount).toBe(0)
    expect(folder.includeCount).toBe(1)
    expect(Object.values(folder.flags).every((v) => v === false)).toBe(true)
  })

  it('reads the editable filter flags through', () => {
    const filter = baseFilter({ contacts: true, excludeArchived: true })

    const folder = mapFilterToFolder(filter, undefined)

    expect(folder.flags.contacts).toBe(true)
    expect(folder.flags.excludeArchived).toBe(true)
    expect(folder.flags.groups).toBe(false)
    expect(folder.readOnly).toBe(false)
  })
})
