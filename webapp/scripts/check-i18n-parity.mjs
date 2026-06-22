#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import process from 'node:process';

const webappRoot = resolve(new URL('..', import.meta.url).pathname);
const catalogs = [
	{ language: 'en', path: resolve(webappRoot, 'src/i18n/messages/en.ts') },
	{ language: 'fa', path: resolve(webappRoot, 'src/i18n/messages/fa.ts') },
	{ language: 'ar', path: resolve(webappRoot, 'src/i18n/messages/ar.ts') },
];

const keyPattern = /^[\t ]*'([^']+)'[\t ]*:/gm;
const placeholderPattern = /\{([A-Za-z0-9_]+)\}/g;

function extractCatalog(catalog) {
	const source = readFileSync(catalog.path, 'utf8');
	const keys = [];
	const duplicates = new Set();
	const seen = new Set();
	const placeholdersByKey = new Map();

	for (const match of source.matchAll(keyPattern)) {
		const key = match[1];
		keys.push(key);

		if (seen.has(key)) {
			duplicates.add(key);
		}
		seen.add(key);
	}

	for (const key of keys) {
		const valuePattern = new RegExp(`'${escapeRegExp(key)}'\\s*:\\s*'((?:\\\\'|[^'])*)'`, 'm');
		const valueMatch = source.match(valuePattern);
		const value = valueMatch?.[1] ?? '';
		placeholdersByKey.set(key, sortedUnique([...value.matchAll(placeholderPattern)].map((match) => match[1])));
	}

	return {
		...catalog,
		keys,
		keySet: new Set(keys),
		duplicates: [...duplicates].sort(),
		placeholdersByKey,
	};
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sortedUnique(values) {
	return [...new Set(values)].sort();
}

function diffKeys(source, target) {
	return [...source.keySet].filter((key) => !target.keySet.has(key)).sort();
}

function formatList(values) {
	return values.map((value) => `  - ${value}`).join('\n');
}

const extractedCatalogs = catalogs.map(extractCatalog);
const baseCatalog = extractedCatalogs[0];
const failures = [];

for (const catalog of extractedCatalogs) {
	if (catalog.duplicates.length > 0) {
		failures.push([
			`${catalog.language} catalog has duplicate translation keys:`,
			formatList(catalog.duplicates),
		].join('\n'));
	}
}

for (const catalog of extractedCatalogs.slice(1)) {
	const missing = diffKeys(baseCatalog, catalog);
	const extra = diffKeys(catalog, baseCatalog);

	if (missing.length > 0) {
		failures.push([
			`${catalog.language} catalog is missing keys from ${baseCatalog.language}:`,
			formatList(missing),
		].join('\n'));
	}

	if (extra.length > 0) {
		failures.push([
			`${catalog.language} catalog has keys that do not exist in ${baseCatalog.language}:`,
			formatList(extra),
		].join('\n'));
	}
}

for (const catalog of extractedCatalogs.slice(1)) {
	for (const key of baseCatalog.keys) {
		if (!catalog.keySet.has(key)) {
			continue;
		}

		const expected = baseCatalog.placeholdersByKey.get(key) ?? [];
		const actual = catalog.placeholdersByKey.get(key) ?? [];

		if (expected.join('|') !== actual.join('|')) {
			failures.push([
				`${catalog.language} catalog placeholder mismatch for ${key}:`,
				`  expected: ${expected.length > 0 ? expected.join(', ') : '(none)'}`,
				`  actual:   ${actual.length > 0 ? actual.join(', ') : '(none)'}`,
			].join('\n'));
		}
	}
}

if (failures.length > 0) {
	console.error('Campfire i18n parity check failed.');
	console.error('');
	console.error(failures.join('\n\n'));
	process.exit(1);
}

const relativeCatalogs = extractedCatalogs
	.map((catalog) => `${catalog.language}:${relative(webappRoot, catalog.path)}`)
	.join(', ');

console.log(`Campfire i18n parity check passed for ${baseCatalog.keys.length} keys (${relativeCatalogs}).`);
