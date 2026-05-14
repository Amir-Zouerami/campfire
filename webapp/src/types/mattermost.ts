import type { ComponentType } from 'react';

/**
 * A minimal Redux-store-like shape passed by Mattermost to webapp plugins.
 *
 * Campfire does not use Mattermost's Redux store directly in Phase 0.
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
 * A React component used as an icon inside the Mattermost plugin registry.
 */
export type PluginIconComponent = ComponentType<PluginIconProps>;

/**
 * Minimal Mattermost webapp plugin registry methods used by Campfire.
 *
 * The real registry has many more methods. Campfire keeps this boundary narrow
 * and typed so the rest of the webapp does not depend on broad host internals.
 */
export type MattermostPluginRegistry = {
	readonly registerRootComponent: (component: ComponentType) => void;
	readonly registerChannelHeaderButtonAction: (
		icon: PluginIconComponent,
		action: () => void,
		dropdownText: string,
		tooltipText: string,
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
		registerPlugin?: RegisterPlugin;
	}
}
