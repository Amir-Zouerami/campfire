/**
 * EventBus is a tiny typed publish/subscribe channel.
 *
 * It replaces ad-hoc `window.dispatchEvent(new CustomEvent(...))` calls so that
 * payloads are type-checked and nothing leaks into the Mattermost host's global
 * event namespace.
 */
export type EventBus<Payload> = {
	readonly publish: (payload: Payload) => void;
	readonly subscribe: (listener: (payload: Payload) => void) => () => void;
};

/**
 * createEventBus builds an isolated event bus.
 */
export function createEventBus<Payload>(): EventBus<Payload> {
	const listeners = new Set<(payload: Payload) => void>();

	return {
		publish: payload => {
			for (const listener of listeners) {
				listener(payload);
			}
		},
		subscribe: listener => {
			listeners.add(listener);

			return () => {
				listeners.delete(listener);
			};
		},
	};
}
