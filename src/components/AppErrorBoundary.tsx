import { useState } from 'react'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { m } from '#/paraglide/messages'

/** Everything a bug report needs, minus anything private: no query string
 * (F5.4/§6 — filters, search terms or a `?chat=<id>` shouldn't leak into a
 * pasted report), no chat titles or ids (those only ever live in state this
 * component never touches). */
function buildReport(error: unknown): string {
  const details =
    error instanceof Error
      ? (error.stack ?? `${error.name}: ${error.message}`)
      : String(error)

  const url =
    typeof location !== 'undefined'
      ? `${location.origin}${location.pathname}`
      : 'n/a'
  const userAgent =
    typeof navigator !== 'undefined' ? navigator.userAgent : 'n/a'

  return [`TeleFolders — ${url}`, `User agent: ${userAgent}`, '', details].join(
    '\n',
  )
}

export function AppErrorBoundary({ error }: ErrorComponentProps) {
  const [copied, setCopied] = useState(false)
  const report = buildReport(error)

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-xl font-semibold">{m.error_boundary_title()}</h1>
      <p className="text-sm text-muted-foreground">
        {m.error_boundary_description()}
      </p>
      <pre className="w-full overflow-auto rounded-md border border-border bg-muted p-3 text-left text-xs whitespace-pre-wrap text-muted-foreground">
        {report}
      </pre>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void navigator.clipboard.writeText(report).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            })
          }}
        >
          {copied ? m.error_boundary_copied() : m.error_boundary_copy()}
        </Button>
        <Button type="button" onClick={() => window.location.reload()}>
          {m.error_boundary_reload()}
        </Button>
      </div>
    </div>
  )
}
