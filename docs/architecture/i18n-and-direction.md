# Campfire localization and direction architecture

Campfire supports English, Persian, and Arabic across generated messages and the webapp UI. The implementation is intentionally lightweight: it is a small internal localization layer, not a full external i18n framework.

## Frontend rules

- UI text must use typed translation keys from `webapp/src/shared/i18n/messages`.
- English is the source catalog. Persian and Arabic must contain the same keys and the same interpolation placeholders.
- Components should call `useI18n()` instead of importing catalogs directly.
- Dynamic user-authored values must remain user-authored. Do not translate names, question labels, reasons, task titles, saved filter names, workspace names, or free text answers.
- Dynamic values inside translated sentences should be wrapped with `isolateBidi`, and user-authored text rendered with `dir="auto"` (the `userContent` prop), where mixed RTL/LTR content can occur.
- Layout direction comes from the active language. Persian and Arabic are RTL; English is LTR.
- The active language is resolved per person: their own choice (stored in Mattermost user preferences) wins, then the workspace language, then the workspace timezone, then the browser timezone.
- Validation messages in form schemas are translation keys (`msg('…')`), translated when displayed.
- Date and time controls must store ISO/Gregorian values even when they show localized helper text.

## Backend rules

- Backend-generated Mattermost messages must use `server/i18n` copy providers.
- Business services should pass language decisions into message composition; infrastructure adapters should not own wording.
- Workspace language settings override timezone inference.
- Timezone inference is only the default for newly created or unconfigured workspaces.
- Dynamic identifiers and labels in RTL messages should be wrapped with backend bidi isolation helpers unless they are Mattermost mention/channel tokens.

## Quality gates

`npm run check` runs the catalog parity test (`webapp/src/shared/i18n/catalogs.test.ts`) with the rest of the unit tests. It enforces:

- Persian and Arabic contain every English key;
- Persian and Arabic do not introduce extra keys;
- no message is empty;
- interpolation placeholders match across all three catalogs.

Duplicate keys are a TypeScript error, so the type check catches them.

Backend tests in `server/i18n` verify timezone inference, direction mapping, catalog parity, non-empty notification copy, and RTL bidi isolation behavior.
