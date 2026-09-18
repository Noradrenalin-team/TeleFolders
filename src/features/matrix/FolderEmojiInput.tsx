import { useRef, useState } from 'react'
import { Input } from '#/components/ui/input'
import { Popover, PopoverAnchor, PopoverContent } from '#/components/ui/popover'
import { m } from '#/paraglide/messages'

/** Emoticons the official Telegram clients map to folder icons — anything
 * else still saves, but shows up as a generic folder icon in their apps. */
export const FOLDER_EMOTICONS = [
  '💬',
  '✅',
  '👤',
  '👥',
  '📢',
  '🤖',
  '⭐',
  '💼',
  '📕',
  '🎓',
  '💡',
  '📋',
  '🏡',
  '❤️',
  '🐱',
  '🌹',
  '🎉',
  '👑',
  '🎮',
  '🎵',
  '🎨',
  '📸',
  '⚽️',
  '✈️',
  '🛫',
  '💰',
  '👍',
  '🔒',
  '➕',
  '📁',
]

export function FolderEmojiInput({
  id,
  name,
  value,
  onChange,
  onBlur,
}: {
  id: string
  name: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
}) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div ref={anchorRef}>
          <Input
            id={id}
            name={name}
            value={value}
            maxLength={4}
            autoComplete="off"
            className="text-center"
            aria-haspopup="dialog"
            aria-expanded={open}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onBlur={onBlur}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setOpen(false)
            }}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        aria-label={m.folder_dialog_emoji_palette()}
        className="w-64"
        // Keep focus in the input so typing a custom emoji still works.
        onOpenAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          if (anchorRef.current?.contains(event.target as Node)) {
            event.preventDefault()
          }
        }}
      >
        <div className="grid grid-cols-6 gap-1">
          {FOLDER_EMOTICONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-pressed={value === emoji}
              className="flex size-9 items-center justify-center rounded-md text-lg hover:bg-accent aria-pressed:bg-accent"
              onClick={() => {
                onChange(emoji)
                setOpen(false)
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent"
          onClick={() => {
            onChange('')
            setOpen(false)
          }}
        >
          {m.folder_dialog_emoji_clear()}
        </button>
      </PopoverContent>
    </Popover>
  )
}
