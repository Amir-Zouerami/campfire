# Campfire webapp architecture

The webapp is a Mattermost webapp plugin: one JavaScript file that Mattermost loads into its own page. It targets Mattermost 12.0 and newer, which ships React 19.

## Running inside Mattermost

- **React comes from the host.** `react` and `react-dom` are not bundled; the build maps them to the `React` and `ReactDOM` globals Mattermost exposes. Bundling a second copy, or a JSX runtime built for another React version, crashes on load. `scripts/verify-bundle.mjs` runs after every build and fails it if the bundle contains a copy of React, references React internals, or uses CommonJS `require`.
- **React Compiler.** Components are compiled with the React Compiler, so they are written without `useMemo`, `useCallback` or `React.memo`.
- **Styles are isolated.** Tailwind utilities carry the `cf:` prefix and are marked important, because Mattermost's own CSS is global and unlayered. Mattermost sets the root font size to 10px, so the theme defines every size in pixels and components never use `rem`.
- **Fonts are embedded.** Plus Jakarta Sans (Latin) and Vazirmatn (Persian and Arabic) are inlined into the bundle from `assets/fonts`.

## Layers

Imports only go downwards. ESLint enforces this (`eslint.config.js`).

| Layer | Path | May import |
| --- | --- | --- |
| Plugin entry | `src/index.tsx`, `src/plugin` | everything |
| App shell | `src/app` | features, shared |
| Features | `src/features/<area>/<page>` | shared only, never another feature |
| Shared | `src/shared` | shared only |

### `src/shared`

- `ui/` is the design system: layout, primitives, form controls, feedback, data display, overlays and navigation. **It is the only place that contains Tailwind classes.** A page that needs a new visual pattern adds a component here and uses it; it does not style markup locally.
- `forms/` binds the form controls to TanStack Form (`useAppForm`), so a field is declared once with its label and validation. Schemas use `zod/mini`.
- `api/` is the HTTP client and one module per backend area. A failed request raises one toast through a shared event bus; callers do not report errors themselves.
- `data/` holds query hooks and domain helpers used by more than one feature (standup configuration, leave types and labels, report sort options).
- `i18n/` holds the three message catalogs and the language resolution. See `i18n-and-direction.md`.
- `host/` reads what Mattermost is showing (current channel and team) from its store.
- `session/`, `navigation/`, `query/`, `users/`, `channels/`, `lib/` are small single-purpose modules.

### `src/features`

One folder per sidebar page, grouped by area: `my-day`, `team-review`, `reports`, `settings`, plus `workspace-setup`. A page keeps its pure logic (parsing, validation, sorting) in plain `.ts` files with tests next to it, and its components compose `shared/ui`.

### `src/app`

The window and its sidebar, the page registry (`pages.ts`, which also decides who may see each page) and the bootstrap that loads the workspace for the current channel.

## Server state

All server data goes through TanStack Query. Keys are built by `workspaceKey(workspaceID, …)`, so a mutation refreshes related data by invalidating a key prefix. The cache lives for the lifetime of the plugin, which makes reopening Campfire instant.

## Commands

Run from `webapp/`:

- `npm run check` runs the type check, lint, format check and unit tests.
- `npm run build` builds the bundle and verifies it.
- `npm run format` formats the source with Prettier.
