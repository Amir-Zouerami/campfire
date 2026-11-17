import { getHostStore } from '@/shared/host';
import { isRecord } from '@/shared/lib/guards';

import { ApiClientError } from './errors';
import { encodePath, requestJson } from './http';

/**
 * PREFERENCE_CATEGORY is Campfire's namespace inside Mattermost's per-user preferences.
 * Mattermost reserves the `pp_` prefix for plugin preferences.
 */
const PREFERENCE_CATEGORY = 'pp_dev.zouerami.campfire';

type StoredPreference = {
	readonly user_id: string;
	readonly category: string;
	readonly name: string;
	readonly value: string;
};

/**
 * readLoadedPreference looks a preference up in the preferences Mattermost has already loaded
 * for the signed-in user. It returns `undefined` when Mattermost's store is unavailable or has
 * not loaded preferences yet, and `null` when they are loaded and this one is simply unset.
 */
function readLoadedPreference(name: string): string | null | undefined {
	const state = getHostStore()?.getState();
	const entities = isRecord(state) ? state.entities : undefined;
	const preferences = isRecord(entities) ? entities.preferences : undefined;
	const mine = isRecord(preferences) ? preferences.myPreferences : undefined;

	if (!isRecord(mine) || Object.keys(mine).length === 0) {
		return undefined;
	}

	const stored = mine[`${PREFERENCE_CATEGORY}--${name}`];

	return isRecord(stored) && typeof stored.value === 'string' ? stored.value : null;
}

/**
 * getUserPreference reads one Campfire preference for a user, or null when unset.
 *
 * Mattermost loads every preference of the signed-in user at startup, so the value is normally
 * read from its store without a request. The request is only a fallback; it reads the whole
 * category because Mattermost has no single-preference endpoint that is friendly to a missing value.
 */
export async function getUserPreference(userID: string, name: string): Promise<string | null> {
	const loaded = readLoadedPreference(name);
	if (loaded !== undefined) {
		return loaded;
	}

	try {
		const preferences = await requestJson<readonly StoredPreference[]>(`/users/${encodePath(userID)}/preferences/${PREFERENCE_CATEGORY}`, {
			target: 'mattermost',
			silent: true,
		});

		return preferences.find(preference => preference.name === name)?.value ?? null;
	} catch (error: unknown) {
		// Mattermost answers 404 when the category has never been written, which simply means "unset".
		if (error instanceof ApiClientError && error.isNotFound) {
			return null;
		}

		throw error;
	}
}

/**
 * setUserPreference stores one Campfire preference for a user.
 */
export async function setUserPreference(userID: string, name: string, value: string): Promise<void> {
	const preferences: readonly StoredPreference[] = [{ user_id: userID, category: PREFERENCE_CATEGORY, name, value }];

	await requestJson<unknown>(`/users/${encodePath(userID)}/preferences`, {
		method: 'PUT',
		target: 'mattermost',
		body: preferences,
		silent: true,
	});
}
