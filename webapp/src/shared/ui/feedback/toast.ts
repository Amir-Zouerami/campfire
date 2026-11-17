import { useSyncExternalStore } from 'react';

/**
 * ToastTone selects a toast's icon and colour.
 */
export type ToastTone = 'success' | 'error' | 'info';

/**
 * ToastItem is one visible toast.
 */
export type ToastItem = {
	readonly id: number;
	readonly tone: ToastTone;
	readonly message: string;
};

const DISMISS_AFTER_MS: Readonly<Record<ToastTone, number>> = { success: 4000, info: 5000, error: 8000 };
const MAX_TOASTS = 4;

let toasts: readonly ToastItem[] = [];
let nextID = 1;
const listeners = new Set<() => void>();

function emit(): void {
	for (const listener of listeners) {
		listener();
	}
}

/**
 * dismissToast removes a toast.
 */
export function dismissToast(id: number): void {
	toasts = toasts.filter(item => item.id !== id);
	emit();
}

function show(tone: ToastTone, message: string): void {
	// Identical messages collapse so a failing background request cannot flood the screen.
	if (toasts.some(item => item.tone === tone && item.message === message)) {
		return;
	}

	const id = nextID++;
	toasts = [...toasts, { id, tone, message }].slice(-MAX_TOASTS);
	emit();
	window.setTimeout(() => dismissToast(id), DISMISS_AFTER_MS[tone]);
}

/**
 * toast shows a transient message. It is a module-level API so mutations and the HTTP
 * client can report outcomes without prop drilling.
 */
export const toast = {
	success: (message: string): void => show('success', message),
	error: (message: string): void => show('error', message),
	info: (message: string): void => show('info', message),
};

/**
 * useToasts subscribes a component to the visible toasts.
 */
export function useToasts(): readonly ToastItem[] {
	return useSyncExternalStore(
		listener => {
			listeners.add(listener);

			return () => {
				listeners.delete(listener);
			};
		},
		() => toasts,
	);
}
