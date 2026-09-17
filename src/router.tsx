import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { deLocalizeUrl, localizeUrl } from '#/paraglide/runtime'

import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { getContext } from './integrations/tanstack-query/root-provider'

export function getRouter() {
  const context = getContext()

  const router = createTanStackRouter({
    routeTree,
    context,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    rewrite: {
      input: ({ url }) => deLocalizeUrl(url),
      output: ({ url }) => localizeUrl(url),
    },
  })

  setupRouterSsrQueryIntegration({
    router,
    queryClient: context.queryClient,
    // The Telegram layer only ever runs client-side (see src/telegram/client.ts),
    // so no query here ever resolves during SSR. Without this, a client-only
    // query stays enabled:false on the server and the SSR-streaming hydration
    // leaves it stuck in a "paused" fetchStatus on the client forever, since it
    // waits for a server-streamed result that will never arrive.
    dehydrateOptions: { shouldDehydrateQuery: () => false },
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
