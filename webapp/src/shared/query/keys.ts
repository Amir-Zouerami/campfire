/**
 * Query keys are always hierarchical so a whole area can be invalidated by prefix:
 * `['campfire', 'workspace', workspaceID, area, ...]`.
 */
export type QueryKey = readonly unknown[];

/**
 * workspaceKey builds a key scoped to one workspace.
 */
export function workspaceKey(workspaceID: string, ...parts: readonly unknown[]): QueryKey {
	return ['campfire', 'workspace', workspaceID, ...parts];
}

/**
 * globalKey builds a key for data that is not tied to one workspace.
 */
export function globalKey(...parts: readonly unknown[]): QueryKey {
	return ['campfire', 'global', ...parts];
}

/**
 * userKey identifies one cached Mattermost user profile.
 */
export function userKey(userID: string): QueryKey {
	return ['campfire', 'user', userID];
}

/**
 * BOOTSTRAP_KEY prefixes the startup data (user, workspace, capabilities). Features that change
 * workspace-level settings invalidate it so the shell picks up the new values.
 */
export const BOOTSTRAP_KEY: QueryKey = ['campfire', 'bootstrap'];
