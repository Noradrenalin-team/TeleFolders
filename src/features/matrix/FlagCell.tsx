import { Circle, CircleDot, Loader2 } from 'lucide-react'
import { cn } from 'cn'

export function FlagCell({
  active,
  label,
  disabled = false,
  pending = false,
  onClick,
}: {
  active: boolean
  label: string
  disabled?: boolean
  pending?: boolean
  onClick?: () => void
}) {
  const Icon = active ? CircleDot : Circle

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled || pending}
      onClick={onClick}
      className={cn(
        'flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors',
        'hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40',
        active && 'text-primary',
      )}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Icon className="size-4" aria-hidden="true" />
      )}
    </button>
  )
}
