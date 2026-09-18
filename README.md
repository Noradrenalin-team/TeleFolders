# TeleFolders

A web app for managing your Telegram chats: log in with your own account and
get a matrix of every chat × every folder — one click sorts, pins, excludes
or archives a chat instead of the several taps the official client needs per
chat per folder.

**Unofficial, browser-only.** MTProto runs entirely in your browser via
[mtcute](https://mtcute.dev); the server only ever serves the static
app shell. Your phone number, login code, 2FA password and session never
reach anything but Telegram's own servers — see
[docs/tz/ТЗ.md](./docs/tz/ТЗ.md) §2/§6 for the details.

Full spec and work plan: [docs/tz/ТЗ.md](./docs/tz/ТЗ.md),
[docs/tz/ПЛАН.md](./docs/tz/ПЛАН.md). Layer rules for contributors are in
[AGENTS.md](./AGENTS.md).

## Getting started

You'll need your own Telegram API credentials — get `api_id`/`api_hash` at
<https://my.telegram.org/apps> (see ТЗ §7 for why these are per-deployment,
not baked into the app).

```bash
cp .env.example .env
# edit .env: VITE_TELEGRAM_API_ID=..., VITE_TELEGRAM_API_HASH=...

pnpm install
pnpm dev
```

Then open the printed local URL and log in with a real Telegram account
(phone number, code, 2FA password if you have one).

## Scripts

```bash
pnpm dev              # dev server
pnpm build             # production build
pnpm preview           # preview a production build

pnpm typecheck         # tsc --noEmit
pnpm lint              # eslint
pnpm check             # prettier --check
pnpm format            # prettier --write + eslint --fix

pnpm test              # vitest (unit tests + Storybook component tests)
pnpm storybook         # Storybook dev server
pnpm build-storybook   # static Storybook build

pnpm generate-routes   # regenerate src/routeTree.gen.ts (do not hand-edit)
pnpm generate-messages # regenerate src/paraglide/** from messages/*.json (do not hand-edit)
```

CI runs `install → lint → prettier → tsc → vitest → build → build-storybook`;
a red pipeline blocks merging.

## Project layout

```
src/
  routes/       index, login, matrix — file-based (TanStack Router)
  telegram/     the ONLY place @mtcute/* is imported
  queries/      TanStack Query options, mutations, cache keys
  features/     matrix, chat-card, auth, folders — UI + feature logic
  components/ui/  shadcn-style primitives
  stores/       TanStack Store (theme, persisted settings)
```

**Layer rule** (see [AGENTS.md](./AGENTS.md)): a component never imports
`@mtcute/*` directly. Component → hook in `queries/` → function in
`telegram/`. This keeps components mockable in Storybook and tests.

## Browsers

Last two versions of Chrome, Firefox, Safari, Edge — WebSocket, IndexedDB
and WebCrypto are required. Clearing site data for this origin deletes the
local session (a normal, expected re-login, not a bug).

## Localization

Base locale is `ru`, with `en` as the second language. Source strings live
in `messages/{locale}.json` (edit these, not the generated files) and are
compiled by `pnpm generate-messages` into `src/paraglide/**`.

## Legacy

The Python/Eel desktop client this project replaces was removed from the
tree by the TanStack Start rewrite; it's still in the repository history
(`git log -- telefolders/`) if you need to reference it, but it isn't
maintained going forward.
