import type { LeaveDurationMode, LeaveHalfDayPart } from '@/types/domain';

/**
 * MyLeaveLoadState describes the personal leave page data state.
 */
export type MyLeaveLoadState = 'idle' | 'loading' | 'ready' | 'validating' | 'saving' | 'error';

/**
 * MyLeaveDraft stores the request-leave form state.
 */
export type MyLeaveDraft = {
	readonly leaveTypeId: string;
	readonly startDate: string;
	readonly endDate: string;
	readonly durationMode: LeaveDurationMode;
	readonly halfDayPart: LeaveHalfDayPart | '';
	readonly startTime: string;
	readonly endTime: string;
	readonly reason: string;
	readonly backupUserId: string;
};

/**
 * MyLeaveDraftPatch updates part of the request-leave form.
 */
export type MyLeaveDraftPatch = Partial<MyLeaveDraft>;

/**
 * MyLeaveWarning describes a user-facing leave warning.
 */
export type MyLeaveWarning = {
	readonly kind: 'validation' | 'local';
	readonly message: string;
};
