import { isRecord } from '@/shared/lib/guards';

/**
 * messageOfError extracts display text from a TanStack Form validation error, which is a
 * plain string for hand-written validators or an issue object for schema validators.
 */
export function messageOfError(error: unknown): string | undefined {
	if (typeof error === 'string') {
		return error;
	}

	if (isRecord(error) && typeof error.message === 'string') {
		return error.message;
	}

	return undefined;
}
