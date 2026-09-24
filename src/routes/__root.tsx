import { Fragment, useEffect } from 'react'
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  useHydrated,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import { getLocale } from '#/paraglide/runtime'
import { THEME_INIT_SCRIPT } from '#/stores/theme'
import { AppHeader } from '#/components/AppHeader'
import { TelegramSync } from '#/components/TelegramSync'
import { AppErrorBoundary } from '#/components/AppErrorBoundary'
import { AppToaster } from '#/components/AppToaster'
import { NotFound } from '#/components/NotFound'
import { m } from '#/paraglide/messages'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

/**
 * ТЗ §6.5: WSS to Telegram only, no third-party scripts. A <meta> tag
 * because GitHub Pages can't set response headers (so no frame-ancestors).
 * - script-src 'unsafe-inline': the theme bootstrap and TanStack Start's
 *   hydration payload are inline; still no other origin can run code.
 * - 'wasm-unsafe-eval': mtcute's MTProto crypto is WebAssembly.
 * - img-src blob:: avatars are downloaded over MTProto into blob URLs.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  "connect-src 'self' wss://*.web.telegram.org https://*.web.telegram.org",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async () => {
    // Other redirect strategies are possible; see
    // https://github.com/TanStack/router/tree/main/examples/react/i18n-paraglide#offline-redirect
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', getLocale())
    }
  },

  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: m.app_title(),
      },
      // Production only: the dev server needs its own HMR socket and inline
      // module scripts, which this would block.
      ...(import.meta.env.PROD
        ? [
            {
              httpEquiv: 'Content-Security-Policy',
              content: CONTENT_SECURITY_POLICY,
            },
          ]
        : []),
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  errorComponent: AppErrorBoundary,
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
})

/**
 * GitHub Pages serves one prerendered shell, in the base locale, for every
 * URL (ТЗ §7.2), and hydration keeps the shell's attributes as they are: on
 * /en/… the header kept its Russian aria-labels and "RU" pressed, and <html>
 * its lang. So the header is remounted once hydrated, in the URL's locale.
 * The switch lives down here, not in RootDocument: re-rendering the root
 * mid-hydration made React hydrate the outlet early and mismatch the shell.
 */
function RemountAfterHydration({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated()
  useEffect(() => {
    document.documentElement.lang = getLocale()
  }, [])
  return <Fragment key={hydrated ? 'client' : 'shell'}>{children}</Fragment>
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang={getLocale()} suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      {/* Browser extensions (e.g. VS Code's) add classes to <body> before
          hydration; that mismatch is harmless and not ours to fix. */}
      <body
        className="flex h-screen flex-col overflow-hidden"
        suppressHydrationWarning
      >
        <RemountAfterHydration>
          <AppHeader />
        </RemountAfterHydration>
        <TelegramSync />
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        <AppToaster />
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
