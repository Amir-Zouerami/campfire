import type { RegisterPlugin } from './shared/host/mattermost';

declare global {
	interface Window {
		/** Mattermost's site base path when served from a sub-path (e.g. `/chat`). */
		basename?: string;
		/** Injected by the Mattermost webapp so plugin bundles can register themselves. */
		registerPlugin?: RegisterPlugin;
	}
}
