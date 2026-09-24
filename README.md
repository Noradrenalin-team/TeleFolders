# TeleFolders

A web app for managing your Telegram chats: log in with your own account and
get a matrix of every chat × every folder — one click sorts, pins, excludes
or archives a chat instead of the several taps the official client needs per
chat per folder.

**Open it:** https://noradrenalin-team.github.io/TeleFolders/

**Unofficial, browser-only.** MTProto runs entirely in your browser via
[mtcute](https://mtcute.dev); the server only ever serves the static
app shell. Your phone number, login code, 2FA password and session never
reach anything but Telegram's own servers — see
[docs/tz/ТЗ.md](./docs/tz/ТЗ.md) §2/§6 for the details.

## What it does

- **Matrix**: every chat × every folder. A cell cycles _not in → included →
  pinned → excluded_; Shift+click excludes straight away, right-click picks
  any state. Folder flags (contacts, groups, bots, muted/read/archived
  exclusions) are the rows on top. Keyboard-driven too: one Tab stop, arrows,
  Page/Home/End, Space to select, Enter to open a chat.
- **Folders**: create, rename, pick an icon, delete, drag to reorder; per-folder
  include/exclude/pinned counters. A folder can never be left empty.
- **Chats**: archive, pin, mute, mark read, open in Telegram; delete (with
  "for both sides" for DMs), leave, block/unblock — every destructive action
  confirms first and reports the result. A Blocked screen lists who's blocked.
- **Bulk**: select with checkboxes, Shift-ranges, drag across checkboxes or
  "select all matching"; then add/exclude/remove from a folder in one write,
  or archive, mute, mark read, leave, delete, block through a cancellable
  queue with progress, FLOOD_WAIT pauses and a per-reason report.
- **Live**: changes made in the official apps (folders, archive, pin, mute,
  read state, new messages) show up without a refresh; a banner shows while
  the connection to Telegram is being restored.
- **Search/filters/sort** kept in the URL; **settings** (language, theme,
  archived chats on open); **phone layout** with a chat list instead of the
  grid; ru/en; light/dark.

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
pnpm build             # production build (static SPA shell in dist/client)
pnpm build:pages       # same, for GitHub Pages: base /TeleFolders/, index.html + 404.html
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
a red pipeline blocks merging. Storybook tests include axe accessibility
checks in "error" mode, so an a11y violation fails the build too.

## Deploying (GitHub Pages)

The production build is a static SPA shell — MTProto runs in the browser, so
there's no server to host (ТЗ §7.2). `.github/workflows/pages.yml` builds and
deploys it on every push to `main`. One-time setup in the repository:

1. **Settings → Pages → Source**: _GitHub Actions_.
2. **Settings → Secrets and variables → Actions**: add `VITE_TELEGRAM_API_ID`
   and `VITE_TELEGRAM_API_HASH`.

The site is served at `https://<owner>.github.io/<repository>/`; the base path
comes from the repository name (`BASE_PATH`). Unknown paths get the same shell
through `404.html`, so direct links like `/TeleFolders/en/matrix` work.

To try the Pages build locally: `pnpm build:pages`, then serve `dist/client`
under `/TeleFolders/` with a 404 fallback to `404.html`.

## Security

- Phone number, code, 2FA password and session stay in the browser (IndexedDB)
  and go only to Telegram; sign-out deletes the database.
- Production builds ship a Content-Security-Policy `<meta>`: scripts only from
  the app itself, network only to the app and `wss://*.web.telegram.org`,
  WebAssembly allowed for mtcute's crypto. Inline scripts are allowed because
  the theme bootstrap and TanStack Start's hydration data are inline.

## Performance

A 2000-chat × 20-folder account (`LargeAccount` story) scrolls at 60 fps and
a cell reacts within ~33 ms in a production build. Rows are virtualized and
memoized, and the grid has a single context menu rather than one per cell;
keep row props stable (see `MatrixView`) when adding to them.

## Project layout

```
src/
  routes/       index, login, matrix, blocked, settings — file-based (TanStack Router)
  telegram/     the ONLY place @mtcute/* is imported
  queries/      TanStack Query options, mutations, bulk runs, live sync
  features/     matrix, chat-card, chat-actions, bulk, blocked, settings, auth
  components/   app shell (header, banners) and ui/ shadcn-style primitives
  hooks/        small shared React hooks
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
