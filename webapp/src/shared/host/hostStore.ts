import type { MattermostStore } from './mattermost';

let hostStore: MattermostStore | null = null;

/**
 * setHostStore remembers the Mattermost store passed to `initialize`.
 */
export function setHostStore(store: MattermostStore | null): void {
	hostStore = store;
}

/**
 * getHostStore returns the Mattermost store, or null before the plugin initializes.
 */
export function getHostStore(): MattermostStore | null {
	return hostStore;
}
