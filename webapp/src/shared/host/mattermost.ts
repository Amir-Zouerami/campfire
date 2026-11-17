import type { ComponentType, ReactElement, ReactNode } from 'react';

/**
 * MattermostChannel is the channel object Mattermost passes to channel-header actions.
 * Both snake_case (API) and camelCase (webapp) spellings occur depending on the server version.
 */
export type MattermostChannel = {
	readonly id: string;
	readonly team_id?: string;
	readonly teamId?: string;
	readonly display_name?: string;
	readonly displayName?: string;
	readonly name?: string;
	readonly type?: string;
};

/**
 * MattermostStore is the Redux-store-like object Mattermost hands to webapp plugins.
 */
export type MattermostStore = {
	readonly getState: () => unknown;
	readonly dispatch: (action: unknown) => unknown;
	readonly subscribe: (listener: () => void) => () => void;
};

/**
 * MattermostPluginRegistry is the subset of Mattermost's plugin registry that Campfire uses.
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
 * MattermostWebappPlugin is the object Campfire registers with `window.registerPlugin`.
 */
export type MattermostWebappPlugin = {
	readonly initialize: (registry: MattermostPluginRegistry, store: MattermostStore) => void;
	readonly uninitialize?: () => void;
};

/**
 * RegisterPlugin is the global function Mattermost exposes to plugin bundles.
 */
export type RegisterPlugin = (pluginID: string, plugin: MattermostWebappPlugin) => void;
