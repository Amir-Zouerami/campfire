# Campfire localization and direction architecture

Campfire supports English, Persian, and Arabic across generated messages and the webapp UI. The implementation is intentionally lightweight: it is a small internal localization layer, not a full external i18n framework.

## Frontend rules

- UI text must use typed translation keys from `webapp/src/i18n/messages`.
- English is the source catalog. Persian and Arabic must contain the same keys and the same interpolation placeholders.
- Components should call `useI18n()` instead of importing catalogs directly.
- Dynamic user-authored values must remain user-authored. Do not translate names, question labels, reasons, task titles, saved filter names, workspace names, or free text answers.
- Dynamic values inside translated sentences should be rendered with `BidiText` or the `bidi` helper where mixed RTL/LTR content can occur.
- Layout direction comes from the active language. Persian and Arabic are RTL; English is LTR.
- Date and time controls must store ISO/Gregorian values even when they show localized helper text.

## Backend rules

- Backend-generated Mattermost messages must use `server/i18n` copy providers.
- Business services should pass language decisions into message composition; infrastructure adapters should not own wording.
- Workspace language settings override timezone inference.
- Timezone inference is only the default for newly created or unconfigured workspaces.
- Dynamic identifiers and labels in RTL messages should be wrapped with backend bidi isolation helpers unless they are Mattermost mention/channel tokens.

## Quality gates

`npm run check` runs `npm run check:i18n` before TypeScript validation. The parity check enforces:

- no duplicate frontend translation keys;
- Persian and Arabic contain every English key;
- Persian and Arabic do not introduce extra keys;
- interpolation placeholders match across all three catalogs.

Backend tests in `server/i18n` verify timezone inference, direction mapping, catalog parity, non-empty notification copy, and RTL bidi isolation behavior.
