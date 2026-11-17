/**
 * safeExternalUrl returns a URL only when it is an http(s) or mailto link. Links such as a
 * task's board URL are typed by other people, so a `javascript:` or `data:` URL must never
 * reach an `href`.
 */
export function safeExternalUrl(value: string): string | null {
	const trimmed = value.trim();
	if (trimmed === '') {
		return null;
	}

	try {
		const url = new URL(trimmed);

		return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:' ? url.href : null;
	} catch {
		return null;
	}
}
