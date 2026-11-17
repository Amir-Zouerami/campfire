#!/usr/bin/env node
/**
 * Post-build guard for the Mattermost plugin bundle.
 *
 * The bundle runs as a browser IIFE inside Mattermost's React 19 host. These checks catch the
 * ways that goes wrong at runtime but passes the type checker:
 *   - a bundled copy of React's JSX runtime reading removed React internals (the v12 crash),
 *   - CommonJS `require()` calls, which do not exist in a browser IIFE,
 *   - React or ReactDOM accidentally bundled instead of using the host's instance,
 *   - a bundle that grew unexpectedly.
 */
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import console from 'node:console';
import process from 'node:process';

const bundlePath = resolve(import.meta.dirname, '../dist/main.js');
const source = readFileSync(bundlePath, 'utf8');
const sizeKB = Math.round(Buffer.byteLength(source) / 1024);
const BUDGET_KB = 1800;

const forbidden = [
	[/\brequire\(/, 'CommonJS require() call (not available in a browser IIFE)'],
	[/__SECRET_INTERNALS_DO_NOT_USE/, 'React 18 internals reference (breaks on the React 19 host)'],
	[/ReactCurrentOwner/, 'React internals reference (removed in React 19)'],
	[/__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE/, 'direct React client internals access'],
	[/react-dom\.production|react\.production\.min|scheduler\.production/, 'a bundled React/ReactDOM/Scheduler copy'],
];

const failures = forbidden.filter(([pattern]) => pattern.test(source)).map(([, reason]) => reason);

if (!/__COMPILER_RUNTIME/.test(source)) {
	failures.push('React Compiler runtime was not wired to the host React (expected __COMPILER_RUNTIME)');
}

if (sizeKB > BUDGET_KB) {
	failures.push(`bundle is ${sizeKB} kB, over the ${BUDGET_KB} kB budget`);
}

if (failures.length > 0) {
	console.error(`Bundle verification failed for ${bundlePath}:`);
	for (const failure of failures) {
		console.error(`  - ${failure}`);
	}
	process.exit(1);
}

process.stdout.write(`Bundle verified: ${sizeKB} kB, host React 19 only, no CommonJS, compiler runtime linked.\n`);
