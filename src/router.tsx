import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { deLocalizeUrl, localizeUrl } from '#/paraglide/runtime'

import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { getContext } from './integrations/tanstack-query/root-provider'

// Deployed under a base path (GitHub Pages: /TeleFolders/), the router strips
// it *before* running the rewrite below and adds it back *after* — while
// Paraglide's URL patterns (vite.config.ts) include it, since they also read
// the real window location. So the prefix goes back on around each call.
const basePrefix = import.meta.env.BASE_URL.replace(/\/$/, '')

function withBasePrefix(url: URL, transform: (url: URL) => URL): URL {
  if (!basePrefix) return transform(url)
  const full = new URL(url)
  full.pathname = basePrefix + url.pathname
  const result = new URL(transform(full))
  if (result.pathname.startsWith(basePrefix)) {
    result.pathname = result.pathname.slice(basePrefix.length) || '/'
  }
  return result
}

export function getRouter() {
  const context = getContext()

  const router = createTanStackRouter({
    routeTree,
    context,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    rewrite: {
      input: ({ url }) => withBasePrefix(url, deLocalizeUrl),
      output: ({ url }) => withBasePrefix(url, localizeUrl),
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
