import { cleanString, isRecord } from '@/shared/lib/guards';

import type { MattermostStore } from './mattermost';

/**
 * HostContext is the Mattermost location (channel and team) Campfire should operate on.
 */
export type HostContext = {
	readonly channelID: string | null;
	readonly channelName: string | null;
	readonly channelType: string | null;
	readonly teamID: string | null;
};

const EMPTY_CONTEXT: HostContext = { channelID: null, channelName: null, channelType: null, teamID: null };

/**
 * ELIGIBLE_CHANNEL_TYPES are the Mattermost channel types that can host a workspace:
 * public (O), private (P) and group messages (G). Direct messages (D) never can.
 */
const ELIGIBLE_CHANNEL_TYPES = new Set(['O', 'P', 'G']);

/**
 * isWorkspaceEligibleChannelType reports whether a channel may become a Campfire workspace.
 * An unknown type is allowed because the server performs the authoritative check.
 */
export function isWorkspaceEligibleChannelType(channelType: string | null): boolean {
	const type = cleanString(channelType);

	return type === '' || ELIGIBLE_CHANNEL_TYPES.has(type);
}

/**
 * readHostContext derives the current channel and team from Mattermost's Redux state.
 */
export function readHostContext(store: MattermostStore | null): HostContext {
	const state = store?.getState();
	if (!isRecord(state)) {
		return EMPTY_CONTEXT;
	}

	const entities = child(state, 'entities');
	const channels = child(entities, 'channels');
	const channelID = text(channels, 'currentChannelId');
	const channel = channelID === null ? null : child(child(channels, 'channels'), channelID);

	return {
		channelID,
		channelName: firstText(channel, ['display_name', 'displayName', 'name']),
		channelType: text(channel, 'type'),
		teamID: firstText(channel, ['team_id', 'teamId']) ?? text(child(entities, 'teams'), 'currentTeamId'),
	};
}

/**
 * subscribeToHostContext notifies when the channel or team Mattermost is showing changes.
 *
 * Mattermost's store notifies on every Redux action, so changes are filtered down to
 * the two identifiers Campfire cares about instead of polling the URL.
 */
export function subscribeToHostContext(store: MattermostStore, onChange: (context: HostContext) => void): () => void {
	let last = readHostContext(store);

	return store.subscribe(() => {
		const next = readHostContext(store);
		if (next.channelID === last.channelID && next.teamID === last.teamID) {
			return;
		}

		last = next;
		onChange(next);
	});
}

function child(value: unknown, key: string): Record<string, unknown> | null {
	if (!isRecord(value)) {
		return null;
	}

	const property = value[key];

	return isRecord(property) ? property : null;
}

function text(value: unknown, key: string): string | null {
	if (!isRecord(value)) {
		return null;
	}

	const property = value[key];
	const clean = typeof property === 'string' ? property.trim() : '';

	return clean === '' ? null : clean;
}

function firstText(value: unknown, keys: readonly string[]): string | null {
	for (const key of keys) {
		const found = text(value, key);
		if (found !== null) {
			return found;
		}
	}

	return null;
}
