import type { ErrorComponentProps } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { m } from '#/paraglide/messages'

export function AppErrorBoundary({ error }: ErrorComponentProps) {
  const details =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error)

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-xl font-semibold">{m.error_boundary_title()}</h1>
      <p className="text-sm text-muted-foreground">
        {m.error_boundary_description()}
      </p>
      <pre className="w-full overflow-auto rounded-md border border-border bg-muted p-3 text-left text-xs text-muted-foreground">
        {details}
      </pre>
      <Button type="button" onClick={() => window.location.reload()}>
        {m.error_boundary_reload()}
      </Button>
    </div>
  )
}
