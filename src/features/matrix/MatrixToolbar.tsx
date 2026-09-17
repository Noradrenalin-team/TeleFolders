import { Search } from 'lucide-react'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { cn } from 'cn'
import type { MatrixSearch } from '#/features/matrix/filters'
import { m } from '#/paraglide/messages'

const TYPE_OPTIONS: ReadonlyArray<{
  value: MatrixSearch['type']
  label: () => string
}> = [
  { value: 'all', label: () => m.matrix_filter_type_all() },
  { value: 'user', label: () => m.matrix_filter_type_user() },
  { value: 'bot', label: () => m.matrix_filter_type_bot() },
  { value: 'group', label: () => m.matrix_filter_type_group() },
  { value: 'channel', label: () => m.matrix_filter_type_channel() },
]

const SORT_OPTIONS: ReadonlyArray<{
  value: MatrixSearch['sort']
  label: () => string
}> = [
  { value: 'default', label: () => m.matrix_sort_default() },
  { value: 'name', label: () => m.matrix_sort_name() },
  { value: 'folders', label: () => m.matrix_sort_folders() },
  { value: 'unread', label: () => m.matrix_sort_unread() },
]

export function MatrixToolbar({
  search,
  onChange,
}: {
  search: MatrixSearch
  onChange: (patch: Partial<MatrixSearch>) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
      <div className="relative w-56 shrink-0">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={search.q}
          onChange={(event) => onChange({ q: event.target.value })}
          placeholder={m.matrix_search_placeholder()}
          className="h-8 pl-8"
        />
      </div>

      <Select
        value={search.type}
        onValueChange={(value: MatrixSearch['type']) =>
          onChange({ type: value })
        }
      >
        <SelectTrigger size="sm" className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TYPE_OPTIONS.map(({ value, label }) => (
            <SelectItem key={value} value={value}>
              {label()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={search.sort}
        onValueChange={(value: MatrixSearch['sort']) =>
          onChange({ sort: value })
        }
      >
        <SelectTrigger size="sm" className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map(({ value, label }) => (
            <SelectItem key={value} value={value}>
              {label()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ToggleButton
        pressed={search.archived}
        label={m.matrix_filter_archived()}
        onClick={() => onChange({ archived: !search.archived })}
      />
      <ToggleButton
        pressed={search.muted}
        label={m.matrix_filter_muted()}
        onClick={() => onChange({ muted: !search.muted })}
      />
      <ToggleButton
        pressed={search.unread}
        label={m.matrix_filter_unread()}
        onClick={() => onChange({ unread: !search.unread })}
      />
      <ToggleButton
        pressed={search.noFolder}
        label={m.matrix_filter_no_folder()}
        onClick={() => onChange({ noFolder: !search.noFolder })}
      />
    </div>
  )
}

function ToggleButton({
  pressed,
  label,
  onClick,
}: {
  pressed: boolean
  label: string
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant={pressed ? 'secondary' : 'outline'}
      size="sm"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn('h-8', pressed && 'shadow-xs')}
    >
      {label}
    </Button>
  )
}
