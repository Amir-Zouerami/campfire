import type { MattermostStore } from '@/types/mattermost';

/**
 * The Mattermost Redux-like store reference provided during plugin initialization.
 */
let mattermostStore: MattermostStore | null = null;

/**
 * MattermostHostContext describes the current Mattermost location.
 */
export type MattermostHostContext = {
	readonly channelID: string | null;
	readonly channelName: string | null;
	readonly channelType: string | null;
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
 * isWorkspaceEligibleChannelType returns whether Campfire may create/load a workspace here.
 *
 * Mattermost channel type D is a direct message and must never become a Campfire workspace.
 * Public channels, private channels, and group conversations are allowed.
 */
export function isWorkspaceEligibleChannelType(channelType: string | null): boolean {
	const cleanChannelType = channelType?.trim() ?? '';

	if (cleanChannelType === '') {
		return true;
	}

	return cleanChannelType === 'O' || cleanChannelType === 'P' || cleanChannelType === 'G';
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

	const channelType = getStringProperty(channel, 'type');

	const teamID = firstNonEmptyString([
		getStringProperty(channel, 'team_id'),
		getStringProperty(channel, 'teamId'),
		getStringProperty(teamsState, 'currentTeamId'),
	]);

	return {
		channelID,
		channelName,
		channelType,
		teamID,
	};
}

/**
 * emptyHostContext returns an empty Mattermost context.
 */
function emptyHostContext(): MattermostHostContext {
	return {
		channelID: null,
		channelName: null,
		channelType: null,
		teamID: null,
	};
}

/**
 * getRecordProperty safely reads a record property.
 */
function getRecordProperty(value: unknown, key: string): Record<string, unknown> | null {
	if (!isRecord(value)) {
		return null;
	}

	const property = value[key];

	return isRecord(property) ? property : null;
}

/**
 * getStringProperty safely reads a string property.
 */
function getStringProperty(value: unknown, key: string): string | null {
	if (!isRecord(value)) {
		return null;
	}

	const property = value[key];

	if (typeof property !== 'string') {
		return null;
	}

	const cleanProperty = property.trim();

	return cleanProperty === '' ? null : cleanProperty;
}

/**
 * firstNonEmptyString returns the first non-empty string from a list.
 */
function firstNonEmptyString(values: readonly (string | null)[]): string | null {
	for (const value of values) {
		if (value !== null && value.trim() !== '') {
			return value.trim();
		}
	}

	return null;
}

/**
 * isRecord narrows unknown values to string-keyed records.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
