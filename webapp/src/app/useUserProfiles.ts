import { useCallback, useEffect, useMemo, useState } from 'react';

import { ApiClientError, lookupUsers } from '@/api';
import type { UserProfile } from '@/types/api';

/**
 * UserProfilesByID stores resolved user profiles by Mattermost user ID.
 */
export type UserProfilesByID = Readonly<Record<string, UserProfile>>;

/**
 * UseUserProfilesResult contains resolved profiles and helper methods.
 */
type UseUserProfilesResult = {
	readonly profilesByID: UserProfilesByID;
	readonly loading: boolean;
	readonly errorMessage: string;
	readonly labelForUserID: (userID: string) => string;
};

/**
 * profileCache keeps user profile lookups warm across Campfire pages.
 *
 * Many pages render the same Mattermost users in approvals, reports, roles, and
 * availability. Without a tiny module cache, switching sections repeats lookup
 * POSTs and forces every consumer through loading state again.
 */
const profileCache = new Map<string, UserProfile>();

/**
 * pendingLookupByKey coalesces concurrent identical lookup batches.
 */
const pendingLookupByKey = new Map<string, Promise<readonly UserProfile[]>>();

/**
 * useUserProfiles resolves Mattermost user IDs for display.
 */
export function useUserProfiles(userIDs: readonly string[]): UseUserProfilesResult {
	const userIDKey = userIDs.join('|');
	const normalizedUserIDs = useMemo(() => normalizeUserIDs(userIDs), [userIDKey]);
	const normalizedUserIDKey = normalizedUserIDs.join('|');
	const [profilesByID, setProfilesByID] = useState<UserProfilesByID>(() => cachedProfilesByID(normalizedUserIDs));
	const [loading, setLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * Loads user profiles for currently referenced user IDs.
		 */
		async function loadProfiles(): Promise<void> {
			if (normalizedUserIDs.length === 0) {
				setProfilesByID({});
				setLoading(false);
				setErrorMessage('');
				return;
			}

			const cachedProfiles = cachedProfilesByID(normalizedUserIDs);
			setProfilesByID(current => sameProfileMap(current, cachedProfiles) ? current : cachedProfiles);

			const missingIDs = missingCachedUserIDs(normalizedUserIDs);
			if (missingIDs.length === 0) {
				setLoading(false);
				setErrorMessage('');
				return;
			}

			setLoading(true);
			setErrorMessage('');

			try {
				await lookupMissingProfiles(missingIDs);

				if (!isActive) {
					return;
				}

				const nextProfiles = cachedProfilesByID(normalizedUserIDs);
				setProfilesByID(current => sameProfileMap(current, nextProfiles) ? current : nextProfiles);
				setLoading(false);
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setErrorMessage(errorToMessage(error));
				setLoading(false);
			}
		}

		void loadProfiles();

		return () => {
			isActive = false;
		};
	}, [normalizedUserIDKey]);

	/**
	 * labelForUserID returns the best available user label.
	 */
	const labelForUserID = useCallback((userID: string): string => {
		const cleanUserID = userID.trim();
		const profile = profilesByID[cleanUserID];

		if (profile === undefined) {
			return cleanUserID;
		}

		return profileLabel(profile);
	}, [profilesByID]);

	return useMemo(() => ({
		profilesByID,
		loading,
		errorMessage,
		labelForUserID,
	}), [errorMessage, labelForUserID, loading, profilesByID]);
}

/**
 * profileLabel returns the best display label for one user profile.
 */
export function profileLabel(profile: UserProfile): string {
	if (profile.displayName.trim() !== '') {
		return profile.displayName;
	}

	if (profile.username.trim() !== '') {
		return `@${profile.username}`;
	}

	if (profile.email.trim() !== '') {
		return profile.email;
	}

	return profile.id;
}

/**
 * lookupMissingProfiles loads uncached users and stores them in profileCache.
 */
async function lookupMissingProfiles(userIDs: readonly string[]): Promise<readonly UserProfile[]> {
	const missingIDs = missingCachedUserIDs(userIDs);
	if (missingIDs.length === 0) {
		return [];
	}

	const lookupKey = missingIDs.join('|');
	const pendingLookup = pendingLookupByKey.get(lookupKey);
	if (pendingLookup !== undefined) {
		return pendingLookup;
	}

	const lookupPromise = lookupUsers(missingIDs)
		.then(response => {
			for (const profile of response.users) {
				profileCache.set(profile.id, profile);
			}

			return response.users;
		})
		.finally(() => {
			pendingLookupByKey.delete(lookupKey);
		});

	pendingLookupByKey.set(lookupKey, lookupPromise);

	return lookupPromise;
}

/**
 * cachedProfilesByID returns cached profiles for the requested IDs.
 */
function cachedProfilesByID(userIDs: readonly string[]): UserProfilesByID {
	const profiles: Record<string, UserProfile> = {};

	for (const userID of userIDs) {
		const profile = profileCache.get(userID);
		if (profile !== undefined) {
			profiles[userID] = profile;
		}
	}

	return profiles;
}

/**
 * missingCachedUserIDs returns user IDs that are not in the module cache yet.
 */
function missingCachedUserIDs(userIDs: readonly string[]): readonly string[] {
	return userIDs.filter(userID => !profileCache.has(userID));
}

/**
 * sameProfileMap avoids state updates when cache hydration returns the same profiles.
 */
function sameProfileMap(left: UserProfilesByID, right: UserProfilesByID): boolean {
	const leftKeys = Object.keys(left);
	const rightKeys = Object.keys(right);

	if (leftKeys.length !== rightKeys.length) {
		return false;
	}

	return leftKeys.every(key => left[key] === right[key]);
}

/**
 * normalizeUserIDs trims, de-duplicates, and preserves user ID order.
 */
function normalizeUserIDs(userIDs: readonly string[]): readonly string[] {
	const seen = new Set<string>();
	const normalized: string[] = [];

	for (const userID of userIDs) {
		const cleanUserID = userID.trim();

		if (cleanUserID === '' || seen.has(cleanUserID)) {
			continue;
		}

		seen.add(cleanUserID);
		normalized.push(cleanUserID);
	}

	return normalized;
}

/**
 * errorToMessage converts unknown thrown values into a safe UI message.
 */
function errorToMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return 'Could not resolve user profiles.';
}
