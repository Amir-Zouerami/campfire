/**
 * initialsOf returns up to two uppercase initials for an avatar fallback.
 */
export function initialsOf(name: string): string {
	const words = name
		.trim()
		.split(/[\s._-]+/)
		.filter(word => word !== '');

	if (words.length === 0) {
		return '?';
	}

	const first = Array.from(words[0] ?? '')[0] ?? '';
	const second = words.length > 1 ? (Array.from(words[words.length - 1] ?? '')[0] ?? '') : '';

	return `${first}${second}`.toUpperCase();
}

/**
 * stableIndex maps a string to a stable index in [0, size), used to pick avatar colours.
 */
export function stableIndex(value: string, size: number): number {
	let hash = 0;
	for (const character of value) {
		hash = (hash * 31 + (character.codePointAt(0) ?? 0)) >>> 0;
	}

	return hash % size;
}
