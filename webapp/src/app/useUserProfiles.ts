import { useEffect, useMemo, useState } from 'react';

import { ApiClientError, lookupUsers } from '../api/client';
import type { UserProfile } from '../types/api';

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
 * useUserProfiles resolves Mattermost user IDs for display.
 */
export function useUserProfiles(userIDs: readonly string[]): UseUserProfilesResult {
	const normalizedUserIDs = useMemo(() => normalizeUserIDs(userIDs), [userIDs.join('|')]);
	const [profilesByID, setProfilesByID] = useState<UserProfilesByID>({});
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

			setLoading(true);
			setErrorMessage('');

			try {
				const response = await lookupUsers(normalizedUserIDs);

				if (!isActive) {
					return;
				}

				setProfilesByID(indexProfiles(response.users));
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
	}, [normalizedUserIDs]);

	/**
	 * labelForUserID returns the best available user label.
	 */
	function labelForUserID(userID: string): string {
		const profile = profilesByID[userID];

		if (profile === undefined) {
			return userID;
		}

		if (profile.displayName.trim() !== '') {
			return profile.displayName;
		}

		if (profile.username.trim() !== '') {
			return `@${profile.username}`;
		}

		return profile.id;
	}

	return {
		profilesByID,
		loading,
		errorMessage,
		labelForUserID,
	};
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
 * indexProfiles returns profiles by user ID.
 */
function indexProfiles(profiles: readonly UserProfile[]): UserProfilesByID {
	const indexed: Record<string, UserProfile> = {};

	for (const profile of profiles) {
		indexed[profile.id] = profile;
	}

	return indexed;
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
