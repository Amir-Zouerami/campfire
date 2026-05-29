import { toast as sonnerToast } from 'sonner';

import { ApiClientError } from '@/api/errors';

/**
 * CampfireToastTone identifies the visual and semantic type of a toast.
 */
export type CampfireToastTone = 'error' | 'success' | 'warning' | 'info';

/**
 * CampfireToastOptions contains optional metadata for one toast message.
 */
type CampfireToastOptions = {
	readonly description?: string;
	readonly duration?: number;
	readonly fallbackMessage?: string;
};

/**
 * NormalizedToastMessage is the rendered toast copy after error normalization.
 */
type NormalizedToastMessage = {
	readonly title: string;
	readonly description?: string;
};

/**
 * RecentToastRecord tracks the last rendered message to avoid duplicate API + catch toasts.
 */
type RecentToastRecord = {
	readonly key: string;
	readonly timestamp: number;
};

const duplicateWindowMs = 1200;
let recentToast: RecentToastRecord | null = null;

/**
 * campfireToast is the single frontend notification API for Campfire.
 *
 * Use this wrapper instead of importing Sonner directly so server errors,
 * success messages, and warning copy stay visually consistent and deduped.
 */
export const campfireToast = {
	/**
	 * error renders failures as bottom-right toast notifications.
	 */
	error(input: unknown, options: CampfireToastOptions = {}): void {
		const message = normalizeToastError(input, options.fallbackMessage);
		showToast('error', message, options);
	},

	/**
	 * success renders larger completed actions as bottom-right toast notifications.
	 */
	success(title: string, options: CampfireToastOptions = {}): void {
		showToast('success', { title, description: options.description }, options);
	},

	/**
	 * warning renders non-blocking cautionary messages.
	 */
	warning(title: string, options: CampfireToastOptions = {}): void {
		showToast('warning', { title, description: options.description }, options);
	},

	/**
	 * info renders neutral status messages.
	 */
	info(title: string, options: CampfireToastOptions = {}): void {
		showToast('info', { title, description: options.description }, options);
	},
};

/**
 * toast is exported as a compatibility alias for existing feature hooks.
 */
export const toast = campfireToast;

/**
 * normalizeToastError turns unknown thrown values into safe product copy.
 */
export function normalizeToastError(input: unknown, fallbackMessage = 'Something went wrong.'): NormalizedToastMessage {
	if (input instanceof ApiClientError) {
		return normalizeApiClientError(input);
	}

	if (input instanceof Error) {
		return {
			title: input.message.trim() === '' ? fallbackMessage : input.message,
		};
	}

	if (typeof input === 'string') {
		const cleanInput = input.trim();

		return {
			title: cleanInput === '' ? fallbackMessage : cleanInput,
		};
	}

	return {
		title: fallbackMessage,
	};
}

/**
 * normalizeApiClientError adds short HTTP context while keeping the server
 * message as the title so API-event toasts dedupe hook-level catch toasts.
 */
function normalizeApiClientError(error: ApiClientError): NormalizedToastMessage {
	const title = error.message.trim() === '' ? fallbackTitleForStatus(error.status) : error.message;

	switch (error.status) {
		case 0:
			return { title, description: 'Network error.' };

		case 400:
			return { title, description: 'Check the highlighted fields and try again.' };

		case 401:
			return { title, description: 'Authentication required.' };

		case 403:
			return { title, description: 'Permission denied.' };

		case 404:
			return { title, description: 'Resource not found.' };

		case 409:
			return { title, description: 'Resolve the conflict and try again.' };

		case 500:
		case 502:
		case 503:
		case 504:
			return { title, description: 'Server error.' };

		default:
			return { title };
	}
}

/**
 * fallbackTitleForStatus returns a safe title when the server did not send copy.
 */
function fallbackTitleForStatus(status: number): string {
	if (status === 0) {
		return 'Campfire could not reach the server.';
	}

	return `Campfire request failed (${status}).`;
}

/**
 * showToast renders one deduped Sonner toast with Campfire defaults.
 */
function showToast(tone: CampfireToastTone, message: NormalizedToastMessage, options: CampfireToastOptions): void {
	const key = `${tone}:${message.title}`;

	if (isDuplicateToast(key)) {
		return;
	}

	const toastOptions = {
		description: message.description,
		duration: options.duration ?? durationForTone(tone),
		className: `campfire-toast campfire-toast--${tone}`,
	};

	switch (tone) {
		case 'error':
			sonnerToast.error(message.title, toastOptions);
			return;

		case 'success':
			sonnerToast.success(message.title, toastOptions);
			return;

		case 'warning':
			sonnerToast.warning(message.title, toastOptions);
			return;

		case 'info':
			sonnerToast.info(message.title, toastOptions);
			return;
	}
}

/**
 * isDuplicateToast suppresses duplicate notifications from API events plus hook catches.
 */
function isDuplicateToast(key: string): boolean {
	const now = Date.now();

	if (recentToast !== null && recentToast.key === key && now - recentToast.timestamp <= duplicateWindowMs) {
		return true;
	}

	recentToast = { key, timestamp: now };

	return false;
}

/**
 * durationForTone returns readable durations without making errors disappear too fast.
 */
function durationForTone(tone: CampfireToastTone): number {
	switch (tone) {
		case 'error':
			return 7000;

		case 'warning':
			return 6000;

		case 'success':
			return 3200;

		case 'info':
			return 4200;
	}
}
