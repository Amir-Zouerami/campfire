/**
 * TeamAvailabilityLoadState describes the availability page loading state.
 */
export type TeamAvailabilityLoadState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * TeamAvailabilityRange stores an approved leave date window.
 */
export type TeamAvailabilityRange = {
	readonly startDate: string;
	readonly endDate: string;
};
