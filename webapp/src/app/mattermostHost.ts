import type { MattermostStore } from '../types/mattermost';

let mattermostStore: MattermostStore | null = null;

/**
 * MattermostHostContext describes the current Mattermost location.
 */
export type MattermostHostContext = {
	readonly channelID: string | null;
	readonly channelName: string | null;
	readonly teamID: string | null;
};

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
	return getMattermostHostContext().channelID;
}

/**
 * getMattermostHostContext returns the current Mattermost channel/team context.
 */
export function getMattermostHostContext(): MattermostHostContext {
	if (mattermostStore === null) {
		return emptyHostContext();
	}

	const state = mattermostStore.getState();
	if (!isRecord(state)) {
		return emptyHostContext();
	}

	const entities = getRecordProperty(state, 'entities');
	const channelsState = getRecordProperty(entities, 'channels');
	const teamsState = getRecordProperty(entities, 'teams');

	const channelID = getStringProperty(channelsState, 'currentChannelId');
	const channelRecords = getRecordProperty(channelsState, 'channels');
	const channel = channelID === null ? null : getRecordProperty(channelRecords, channelID);

	const channelName = firstNonEmptyString([
		getStringProperty(channel, 'display_name'),
		getStringProperty(channel, 'displayName'),
		getStringProperty(channel, 'name'),
	]);

	const teamID = firstNonEmptyString([
		getStringProperty(channel, 'team_id'),
		getStringProperty(channel, 'teamId'),
		getStringProperty(teamsState, 'currentTeamId'),
	]);

	return {
		channelID,
		channelName,
		teamID,
	};
}

/**
 * emptyHostContext returns a host context with no loaded Mattermost location.
 */
function emptyHostContext(): MattermostHostContext {
	return {
		channelID: null,
		channelName: null,
		teamID: null,
	};
}

/**
 * getRecordProperty reads an object property as a record.
 */
function getRecordProperty(value: unknown, key: string): Record<string, unknown> | null {
	if (!isRecord(value)) {
		return null;
	}

	const property = value[key];

	return isRecord(property) ? property : null;
}

/**
 * getStringProperty reads an object property as a non-empty string.
 */
function getStringProperty(value: unknown, key: string): string | null {
	if (!isRecord(value)) {
		return null;
	}

	const property = value[key];

	return typeof property === 'string' && property.trim() !== '' ? property : null;
}

/**
 * firstNonEmptyString returns the first non-empty string from a list.
 */
function firstNonEmptyString(values: readonly (string | null)[]): string | null {
	for (const value of values) {
		if (value !== null && value.trim() !== '') {
			return value;
		}
	}

	return null;
}

/**
 * isRecord narrows unknown values to string-keyed objects.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
