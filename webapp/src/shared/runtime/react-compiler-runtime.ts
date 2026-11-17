import * as React from 'react';

/**
 * React Compiler runtime shim.
 *
 * The compiler emits `import { c } from 'react/compiler-runtime'`. That package
 * entry is CommonJS and calls `require('react')`, which does not exist inside a
 * browser IIFE bundle. This shim exposes the same `c` function from the host
 * React instance's public `__COMPILER_RUNTIME` export instead, so the plugin
 * always uses the exact React that Mattermost renders with.
 */
type CompilerRuntime = { readonly c: (size: number) => Array<unknown> };

const runtime = (React as unknown as { readonly __COMPILER_RUNTIME?: CompilerRuntime }).__COMPILER_RUNTIME;

if (runtime === undefined) {
	throw new Error('Campfire requires React 19 with the compiler runtime (Mattermost 12 or newer).');
}

export const c = runtime.c;
