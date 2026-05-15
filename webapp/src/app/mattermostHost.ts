import type { MattermostStore } from '../types/mattermost';

let mattermostStore: MattermostStore | null = null;

/**
 * setMattermostHostStore stores the Mattermost Redux-like store reference.
 */
export function setMattermostHostStore(store: MattermostStore): void {
	mattermostStore = store;
}

/**
 * getCurrentChannelID returns the currently selected Mattermost channel ID.
 */
export function getCurrentChannelID(): string | null {
	if (mattermostStore === null) {
		return null;
	}

	const state = mattermostStore.getState();

	if (!isRecord(state)) {
		return null;
	}

	const entities = state.entities;
	if (!isRecord(entities)) {
		return null;
	}

	const channels = entities.channels;
	if (!isRecord(channels)) {
		return null;
	}

	const currentChannelID = channels.currentChannelId;

	return typeof currentChannelID === 'string' && currentChannelID !== '' ? currentChannelID : null;
}

/**
 * isRecord narrows unknown values to string-keyed objects.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
