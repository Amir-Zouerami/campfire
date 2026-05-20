import type { ComponentType, ReactElement, ReactNode } from 'react';

/**
 * MattermostChannel is the minimal channel object passed to channel-header actions.
 */
export type MattermostChannel = {
	readonly id: string;
	readonly team_id?: string;
	readonly display_name?: string;
	readonly name?: string;
};

/**
 * A minimal Redux-store-like shape passed by Mattermost to webapp plugins.
 */
export type MattermostStore = {
	readonly getState: () => unknown;
	readonly dispatch: (action: unknown) => unknown;
	readonly subscribe: (listener: () => void) => () => void;
};

/**
 * Props passed to Mattermost plugin icon components.
 */
export type PluginIconProps = {
	readonly className?: string;
};

/**
 * Minimal Mattermost webapp plugin registry methods used by Campfire.
 *
 * Standup Raven's working modal pattern is:
 * - register a root component
 * - register a channel-header button
 * - button action opens the root component's modal state
 */
export type MattermostPluginRegistry = {
	readonly registerRootComponent: (component: ComponentType) => void;
	readonly registerChannelHeaderButtonAction: (
		icon: ReactElement,
		action: (channel?: MattermostChannel) => void,
		dropdownText: ReactNode,
		tooltipText?: ReactNode,
	) => void;
	readonly registerAppBarComponent?: (
		iconURL: string,
		action: () => void,
		tooltipText: string,
		supportedProductIds?: readonly string[],
		rhsComponent?: ComponentType,
		rhsTitle?: ReactNode,
	) => void;
};

/**
 * Mattermost calls initialize when the webapp plugin is loaded.
 */
export type MattermostWebappPlugin = {
	readonly initialize: (registry: MattermostPluginRegistry, store: MattermostStore) => void;
	readonly uninitialize?: () => void;
};

/**
 * Global Mattermost plugin registration function exposed by the Mattermost webapp.
 */
export type RegisterPlugin = (pluginID: string, plugin: MattermostWebappPlugin) => void;

declare global {
	interface Window {
		basename?: string;
		registerPlugin?: RegisterPlugin;
	}
}
