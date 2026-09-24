/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'

const dirname =
  typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url))

// GitHub Pages serves a project site under /<repo>/, not the domain root
// (ТЗ §7.2). Everything else (dev, Storybook, tests) runs at "/".
const basePath = (process.env.BASE_PATH ?? '/').replace(/\/?$/, '/')
const basePrefix = basePath.slice(0, -1)
const urlOrigin = ':protocol://:domain(.*)::port?'

const { version } = JSON.parse(
  readFileSync(path.join(dirname, 'package.json'), 'utf8'),
) as { version: string }

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
const config = defineConfig({
  base: basePath,
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    devtools({
      // Piping echoes client logs into the terminal and server logs back into
      // the browser, where they get piped again — every warning bounces and
      // grows until the dev server runs out of memory.
      consolePiping: { enabled: false },
    }),
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      strategy: ['url', 'baseLocale'],
      // The default patterns assume the app lives at the domain root; under
      // a base path the locale segment comes after it (/TeleFolders/en/…).
      urlPatterns: [
        {
          pattern: `${urlOrigin}${basePrefix}/:path(.*)?`,
          localized: [
            ['en', `${urlOrigin}${basePrefix}/en/:path(.*)?`],
            ['ru', `${urlOrigin}${basePrefix}/:path(.*)?`],
          ],
        },
      ],
    }),
    tailwindcss(),
    // SPA mode (ТЗ §7.2): MTProto runs entirely in the browser, so the
    // build is a static shell that GitHub Pages can serve for every path.
    tanstackStart({ spa: { enabled: true } }),
    viteReact(),
  ],
  test: {
    projects: [
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
          }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            // Desktop width: below 640px the matrix deliberately turns into
            // the phone list, and most stories exercise the grid.
            viewport: { width: 1280, height: 800 },
            instances: [
              {
                browser: 'chromium',
              },
            ],
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
    ],
  },
})
export default config
