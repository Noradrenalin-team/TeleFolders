export type PeerKind =
  'user' | 'bot' | 'group' | 'supergroup' | 'channel' | 'saved'

/**
 * Adapter over mtcute's marked dialog id vs. raw entity id: `id` is the
 * marked id (works directly as mtcute's `InputPeerLike`, which resolves the
 * access hash internally), so it's the only thing the rest of the app needs
 * to address a peer.
 */
export type PeerRef = {
  id: number
  kind: PeerKind
}

export type ChatFolderRelation = 'include' | 'exclude' | 'pinned'

export type Chat = {
  id: number
  peerId: number
  kind: PeerKind
  title: string
  username?: string
  photoUrl?: string
  isPinned: boolean
  isArchived: boolean
  isMuted: boolean
  unreadCount: number
  isSelf: boolean
  canDelete: boolean
  canLeave: boolean
  canBlock: boolean
  /** Keyed by folder id; a missing key means "not in this folder". */
  folders: Partial<Record<number, ChatFolderRelation>>
}

export type FolderFlag =
  | 'contacts'
  | 'nonContacts'
  | 'groups'
  | 'broadcasts'
  | 'bots'
  | 'excludeMuted'
  | 'excludeRead'
  | 'excludeArchived'

export type Folder = {
  id: number
  title: string
  emoticon?: string
  flags: Record<FolderFlag, boolean>
  /**
   * Explicitly included, excluded and pinned peer counts (F4.5 column
   * header). `includeCount` is the union of `include` and `pinned` — the
   * number of distinct chats the folder actually contains, since a pinned
   * peer isn't also counted in `include` (ТЗ §3.3/§3.4).
   */
  includeCount: number
  excludeCount: number
  pinnedCount: number
  /** Service filter (`DialogFilterDefault`) or a shared chatlist — not editable (ТЗ §3.5). */
  readOnly: boolean
}

export type Profile = {
  id: number
  username?: string
  firstName: string
  lastName?: string
  photoUrl?: string
}
