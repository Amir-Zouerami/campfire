/**
 * ESM replacement for `use-sync-external-store/shim`.
 *
 * The npm shim is CommonJS and calls `require('react')`, which cannot run inside Campfire's
 * browser bundle. React 19 ships `useSyncExternalStore` natively, so the shim is just a re-export.
 */
export { useSyncExternalStore } from 'react';
