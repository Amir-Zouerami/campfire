/**
 * Theme is the colour scheme of the Campfire window.
 */
export type Theme = 'dark' | 'light';

/**
 * DEFAULT_THEME applies until a person chooses otherwise.
 */
export const DEFAULT_THEME: Theme = 'dark';

/**
 * parseTheme returns a stored theme, or null for anything unknown or unset.
 */
export function parseTheme(value: string | null | undefined): Theme | null {
	switch (value?.trim().toLowerCase()) {
		case 'dark':
			return 'dark';
		case 'light':
			return 'light';
		default:
			return null;
	}
}

/**
 * oppositeTheme returns the theme a toggle switches to.
 */
export function oppositeTheme(theme: Theme): Theme {
	return theme === 'dark' ? 'light' : 'dark';
}
