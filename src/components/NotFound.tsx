import { Link } from '@tanstack/react-router'
import { m } from '#/paraglide/messages'

export function NotFound() {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 px-4 py-24 text-center">
      <h1 className="text-lg font-semibold">{m.not_found_title()}</h1>
      <Link
        to="/"
        className="text-sm text-primary underline-offset-4 hover:underline"
      >
        {m.not_found_home()}
      </Link>
    </div>
  )
}
