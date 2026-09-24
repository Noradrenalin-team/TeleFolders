/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TELEGRAM_API_ID?: string
  readonly VITE_TELEGRAM_API_HASH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** package.json "version", injected by vite.config.ts (F8.4 "О программе"). */
declare const __APP_VERSION__: string
