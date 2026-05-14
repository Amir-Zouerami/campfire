/**
 * Browser event used to open the Campfire root shell from Mattermost UI actions.
 */
export const CAMPFIRE_OPEN_EVENT = 'campfire:open';

/**
 * Dispatches an event that asks the Campfire root component to open.
 */
export function openCampfire(): void {
	window.dispatchEvent(new CustomEvent(CAMPFIRE_OPEN_EVENT));
}
