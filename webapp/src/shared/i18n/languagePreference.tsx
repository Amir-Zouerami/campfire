import { createContext, use, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getUserPreference, setUserPreference } from '@/shared/api/preferences';

import { parseLanguagePreference } from './language';
import type { LanguagePreference } from './types';

const PREFERENCE_NAME = 'language';
const STORAGE_KEY = 'campfire:language';

/**
 * LanguagePreferenceValue lets any component read and change the user's language choice.
 */
export type LanguagePreferenceValue = {
	readonly preference: LanguagePreference;
	readonly setPreference: (preference: LanguagePreference) => void;
};

const LanguagePreferenceContext = createContext<LanguagePreferenceValue>({
	preference: 'auto',
	setPreference: () => undefined,
});

/**
 * useLanguagePreference returns the user's language choice and a setter.
 */
export function useLanguagePreference(): LanguagePreferenceValue {
	return use(LanguagePreferenceContext);
}

/**
 * useLanguagePreferenceController owns the preference state.
 *
 * The choice is stored in Mattermost's per-user preferences so it follows the
 * user across browsers, and mirrored in localStorage so the first paint after a
 * reload already uses the right language. Failures never block the UI: the
 * localStorage copy keeps working.
 */
export function useLanguagePreferenceController(userID: string | null): LanguagePreferenceValue {
	const queryClient = useQueryClient();
	const [local, setLocal] = useState<LanguagePreference>(readLocalPreference);

	const remote = useQuery({
		queryKey: ['campfire', 'preferences', 'language', userID],
		queryFn: async () => parseLanguagePreference(await getUserPreference(userID ?? '', PREFERENCE_NAME)),
		enabled: userID !== null,
		staleTime: Infinity,
	});

	const save = useMutation({
		mutationFn: async (preference: LanguagePreference) => {
			if (userID !== null) {
				await setUserPreference(userID, PREFERENCE_NAME, preference);
			}
		},
	});

	// The server value wins once loaded; until then the local mirror is used.
	const preference = remote.data ?? local;

	function setPreference(next: LanguagePreference): void {
		setLocal(next);
		writeLocalPreference(next);
		queryClient.setQueryData(['campfire', 'preferences', 'language', userID], next);
		save.mutate(next);
	}

	return { preference, setPreference };
}

/**
 * LanguagePreferenceProvider publishes a preference controller to the subtree.
 */
export function LanguagePreferenceProvider(props: { readonly value: LanguagePreferenceValue; readonly children: ReactNode }): ReactElement {
	return <LanguagePreferenceContext value={props.value}>{props.children}</LanguagePreferenceContext>;
}

/**
 * readLocalPreference reads the localStorage mirror, tolerating blocked storage.
 */
function readLocalPreference(): LanguagePreference {
	try {
		return parseLanguagePreference(window.localStorage.getItem(STORAGE_KEY));
	} catch {
		return 'auto';
	}
}

/**
 * writeLocalPreference updates the localStorage mirror, tolerating blocked storage.
 */
function writeLocalPreference(preference: LanguagePreference): void {
	try {
		window.localStorage.setItem(STORAGE_KEY, preference);
	} catch {
		// Storage can be unavailable (private mode); the server copy still applies.
	}
}
