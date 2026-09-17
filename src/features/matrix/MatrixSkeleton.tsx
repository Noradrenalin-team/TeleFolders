import { m } from '#/paraglide/messages'

export function MatrixSkeleton({ loadedCount }: { loadedCount: number }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-4">
      <div className="flex w-full max-w-sm flex-col gap-2" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
      <p className="text-sm text-muted-foreground" role="status">
        {m.matrix_loading_progress({ count: loadedCount })}
      </p>
    </div>
  )
}
