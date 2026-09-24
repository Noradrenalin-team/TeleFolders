import { describe, expect, it } from 'vitest'
import type { tl } from '@mtcute/web'
import { changesFromUpdate } from '#/telegram/updates'

const NOW = 1_700_000_000
const user = (userId: number): tl.TypePeer => ({ _: 'peerUser', userId })
const changes = (update: object) =>
  changesFromUpdate(update as tl.TypeUpdate, NOW)

describe('changesFromUpdate', () => {
  it('flags any folder change made elsewhere (deleted, edited, reordered)', () => {
    expect(changes({ _: 'updateDialogFilter', id: 5 })).toEqual([
      { kind: 'folders' },
    ])
    expect(changes({ _: 'updateDialogFilterOrder', order: [2, 3] })).toEqual([
      { kind: 'folders' },
    ])
  })

  it('maps archiving done elsewhere to isArchived per chat', () => {
    expect(
      changes({
        _: 'updateFolderPeers',
        folderPeers: [
          { _: 'folderPeer', peer: user(1), folderId: 1 },
          { _: 'folderPeer', peer: user(2), folderId: 0 },
        ],
        pts: 0,
        ptsCount: 0,
      }),
    ).toEqual([
      { kind: 'chat', id: 1, patch: { isArchived: true } },
      { kind: 'chat', id: 2, patch: { isArchived: false } },
    ])
  })

  it('reads mute state from muteUntil against the current time', () => {
    const notify = (muteUntil?: number) =>
      changes({
        _: 'updateNotifySettings',
        peer: { _: 'notifyPeer', peer: user(3) },
        notifySettings: { _: 'peerNotifySettings', muteUntil },
      })
    expect(notify(NOW + 3600)).toEqual([
      { kind: 'chat', id: 3, patch: { isMuted: true } },
    ])
    expect(notify(0)).toEqual([
      { kind: 'chat', id: 3, patch: { isMuted: false } },
    ])
  })

  it('takes the unread count straight from a read receipt, channels too', () => {
    expect(
      changes({
        _: 'updateReadChannelInbox',
        channelId: 777,
        maxId: 10,
        stillUnreadCount: 2,
        pts: 0,
      }),
    ).toEqual([{ kind: 'chat', id: -1000000000777, patch: { unreadCount: 2 } }])
  })

  it('counts incoming messages only, not our own', () => {
    const message = (out: boolean) =>
      changes({
        _: 'updateNewMessage',
        message: { _: 'message', id: 1, out, peerId: user(4), date: NOW },
        pts: 0,
        ptsCount: 0,
      })
    expect(message(false)).toEqual([{ kind: 'unread+1', id: 4 }])
    expect(message(true)).toEqual([])
  })

  it('ignores what the matrix does not show', () => {
    expect(changes({ _: 'updateUserTyping', userId: 1 })).toEqual([])
  })
})
