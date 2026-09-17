import { getClient } from '#/telegram/client'
import type { PeerRef } from '#/telegram/types'

export async function setArchived(
  peer: PeerRef,
  archived: boolean,
): Promise<void> {
  const client = getClient()
  if (archived) {
    await client.archiveChats(peer.id)
  } else {
    await client.unarchiveChats(peer.id)
  }
}

/** Global chat pin, separate from per-folder pinning (F5.2/F4.5, `messages.toggleDialogPin`). */
export async function setPinned(peer: PeerRef, pinned: boolean): Promise<void> {
  const client = getClient()
  const inputPeer = await client.resolvePeer(peer.id)
  await client.call({
    _: 'messages.toggleDialogPin',
    pinned,
    peer: { _: 'inputDialogPeer', peer: inputPeer },
  })
}
