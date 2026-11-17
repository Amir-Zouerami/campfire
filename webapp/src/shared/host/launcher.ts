import { createEventBus } from '@/shared/events/createEventBus';

/**
 * LaunchDetail optionally targets a specific channel when opening Campfire.
 * Without it Campfire opens on whatever channel Mattermost is currently showing.
 */
export type LaunchDetail = {
	readonly channelID?: string;
	readonly channelName?: string;
	readonly channelType?: string;
	readonly teamID?: string;
};

/**
 * LauncherCommand is one request to open, close or toggle the Campfire modal.
 */
export type LauncherCommand =
	{ readonly type: 'open'; readonly detail: LaunchDetail } | { readonly type: 'close' } | { readonly type: 'toggle' };

/**
 * launcher connects Mattermost entry points (channel header, app bar) to the root component.
 * The plugin and the root live in the same bundle, so a module-level bus is sufficient.
 */
export const launcher = createEventBus<LauncherCommand>();

/**
 * openCampfire asks the root component to open the modal.
 */
export function openCampfire(detail: LaunchDetail = {}): void {
	launcher.publish({ type: 'open', detail });
}
