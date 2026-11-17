import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import { listWorkspaceMembers, lookupUsers } from '@/shared/api';
import { createBatchLoader } from '@/shared/lib/batchLoader';
import { userKey, workspaceKey } from '@/shared/query/keys';
import { useWorkspaceID } from '@/shared/session';
import type { UserProfile } from '@/shared/types/api';
import { uniqueStrings } from '@/shared/lib/guards';

const NEVER = Number.POSITIVE_INFINITY;

/**
 * userLoader resolves user IDs in batches, so a page showing twenty people costs one request.
 */
const userLoader = createBatchLoader<string, UserProfile>(async ids => {
	const response = await lookupUsers(ids);

	return new Map(response.users.map(user => [user.id, user]));
});

/**
 * displayNameOf returns the best human label for a user profile.
 */
export function displayNameOf(profile: Pick<UserProfile, 'displayName' | 'username'>): string {
	return profile.displayName.trim() !== '' ? profile.displayName : profile.username;
}

/**
 * UserDirectory resolves user IDs to profiles.
 */
export type UserDirectory = {
	readonly profileOf: (userID: string) => UserProfile | undefined;
	/** Display name, or `fallback` while loading or for unknown users. */
	readonly nameOf: (userID: string, fallback: string) => string;
	readonly isLoading: boolean;
};

/**
 * useUserDirectory resolves a set of user IDs. Each profile is cached forever under its own
 * key, so navigating between pages never refetches a person.
 */
export function useUserDirectory(userIDs: readonly string[]): UserDirectory {
	const ids = uniqueStrings(userIDs);
	const results = useQueries({
		queries: ids.map(id => ({
			queryKey: userKey(id),
			queryFn: async (): Promise<UserProfile | null> => (await userLoader.load(id)) ?? null,
			staleTime: NEVER,
			gcTime: NEVER,
		})),
	});

	const profiles = new Map<string, UserProfile>();
	ids.forEach((id, index) => {
		const profile = results[index]?.data;
		if (profile !== null && profile !== undefined) {
			profiles.set(id, profile);
		}
	});

	return {
		profileOf: userID => profiles.get(userID),
		nameOf: (userID, fallback) => {
			const profile = profiles.get(userID);

			return profile === undefined ? fallback : displayNameOf(profile);
		},
		isLoading: results.some(result => result.isPending),
	};
}

/**
 * useWorkspaceMembers lists the workspace's members and primes the user cache with them.
 */
export function useWorkspaceMembers(): {
	readonly members: readonly UserProfile[];
	readonly isLoading: boolean;
	readonly isError: boolean;
} {
	const workspaceID = useWorkspaceID();
	const queryClient = useQueryClient();
	const query = useQuery({
		queryKey: workspaceKey(workspaceID, 'members'),
		queryFn: async () => {
			const response = await listWorkspaceMembers(workspaceID);
			for (const user of response.users) {
				queryClient.setQueryData(userKey(user.id), user);
			}

			return response.users;
		},
		staleTime: 60_000,
	});

	return { members: query.data ?? [], isLoading: query.isPending, isError: query.isError };
}
