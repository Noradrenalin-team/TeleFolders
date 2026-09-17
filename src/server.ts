import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server'
import { paraglideMiddleware } from '#/paraglide/server.js'

const startFetch = createStartHandler(defaultStreamHandler)

export default {
  fetch(request: Request): Promise<Response> {
    // TanStack Router handles URL localization/delocalization via `rewrite`
    // (see src/router.tsx), so the original request is passed through here.
    return paraglideMiddleware(request, () => startFetch(request))
  },
}
