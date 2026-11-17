import { createContext, use, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getUserPreference, setUserPreference } from '@/shared/api/preferences';

import { DEFAULT_THEME, parseTheme } from './theme';
import type { Theme } from './theme';

const PREFERENCE_NAME = 'theme';
const STORAGE_KEY = 'campfire:theme';

/**
 * ThemePreferenceValue lets any component read and change the user's theme.
 */
export type ThemePreferenceValue = {
	readonly theme: Theme;
	readonly setTheme: (theme: Theme) => void;
};

const ThemePreferenceContext = createContext<ThemePreferenceValue>({
	theme: DEFAULT_THEME,
	setTheme: () => undefined,
});

/**
 * useThemePreference returns the current theme and a setter.
 */
export function useThemePreference(): ThemePreferenceValue {
	return use(ThemePreferenceContext);
}

/**
 * useThemePreferenceController owns the theme state.
 *
 * Like the language, the choice is stored in Mattermost's per-user preferences so it follows
 * the user across browsers, and mirrored in localStorage so the first paint already uses it.
 * The server value only wins when one has been stored; otherwise the local choice stands.
 */
export function useThemePreferenceController(userID: string | null): ThemePreferenceValue {
	const queryClient = useQueryClient();
	const [local, setLocal] = useState<Theme | null>(readLocalTheme);
	const queryKey = ['campfire', 'preferences', PREFERENCE_NAME, userID];

	const remote = useQuery({
		queryKey,
		queryFn: async () => parseTheme(await getUserPreference(userID ?? '', PREFERENCE_NAME)),
		enabled: userID !== null,
		staleTime: Infinity,
	});

	const save = useMutation({
		mutationFn: async (theme: Theme) => {
			if (userID !== null) {
				await setUserPreference(userID, PREFERENCE_NAME, theme);
			}
		},
	});

	function setTheme(next: Theme): void {
		setLocal(next);
		writeLocalTheme(next);
		queryClient.setQueryData(queryKey, next);
		save.mutate(next);
	}

	return { theme: remote.data ?? local ?? DEFAULT_THEME, setTheme };
}

/**
 * ThemePreferenceProvider publishes a theme controller to the subtree.
 */
export function ThemePreferenceProvider(props: { readonly value: ThemePreferenceValue; readonly children: ReactNode }): ReactElement {
	return <ThemePreferenceContext value={props.value}>{props.children}</ThemePreferenceContext>;
}

/**
 * readLocalTheme reads the localStorage mirror, tolerating blocked storage.
 */
function readLocalTheme(): Theme | null {
	try {
		return parseTheme(window.localStorage.getItem(STORAGE_KEY));
	} catch {
		return null;
	}
}

/**
 * writeLocalTheme updates the localStorage mirror, tolerating blocked storage.
 */
function writeLocalTheme(theme: Theme): void {
	try {
		window.localStorage.setItem(STORAGE_KEY, theme);
	} catch {
		// Storage can be unavailable (private mode); the server copy still applies.
	}
}
