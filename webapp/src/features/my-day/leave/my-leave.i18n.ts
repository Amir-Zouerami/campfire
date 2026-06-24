import { useMemo } from 'react';

import { isolateBidiText, useI18n, type TranslationKey } from '@/i18n';
import type { LeaveDurationMode, LeaveHalfDayPart, LeaveRequest, LeaveStatus, LeaveType } from '@/types/domain';

import type { MyLeaveValidationText, MyLeaveWarningText } from './my-leave.helpers';

/**
 * UseMyLeaveText contains localized text used by My Leave mutations and validation.
 */
export type UseMyLeaveText = {
	readonly validation: MyLeaveValidationText;
	readonly warnings: MyLeaveWarningText;
	readonly fallbackError: string;
	readonly invalidRequest: string;
	readonly submittedToast: string;
	readonly cancelledToast: string;
	readonly cancelledMessage: string;
	readonly editRequestedToast: string;
	readonly editRequestedMessage: string;
	readonly deleteRequestedToast: string;
	readonly deleteRequestedMessage: string;
	readonly editSavedToast: string;
	readonly editSavedMessage: string;
	readonly overlapWithOwnRequest: (status: LeaveStatus, range: string) => string;
	readonly requestStatusMessage: (status: LeaveStatus) => string;
};

/**
 * useMyLeaveText centralizes localized workflow messages for the personal leave page.
 */
export function useMyLeaveText(): UseMyLeaveText {
	const { t } = useI18n();

	return useMemo<UseMyLeaveText>(() => ({
		validation: {
			chooseLeaveType: t('myDay.leave.validation.chooseLeaveType'),
			startDateRequired: t('myDay.leave.validation.startDateRequired'),
			endDateRequired: t('myDay.leave.validation.endDateRequired'),
			endBeforeStart: t('myDay.leave.validation.endBeforeStart'),
			chooseHalfDayPart: t('myDay.leave.validation.chooseHalfDayPart'),
			hourlyTimesRequired: t('myDay.leave.validation.hourlyTimesRequired'),
			hourlyEndAfterStart: t('myDay.leave.validation.hourlyEndAfterStart'),
		},
		warnings: {
			ownOverlap: t('myDay.leave.warning.ownOverlap'),
			approvedOverlapOne: t('myDay.leave.warning.approvedOverlapOne'),
			approvedOverlapMany: count => t('myDay.leave.warning.approvedOverlapMany', { count }),
		},
		fallbackError: t('myDay.leave.error.fallback'),
		invalidRequest: t('myDay.leave.error.invalidRequest'),
		submittedToast: t('myDay.leave.toast.submitted'),
		cancelledToast: t('myDay.leave.toast.cancelled'),
		cancelledMessage: t('myDay.leave.message.cancelled'),
		editRequestedToast: t('myDay.leave.toast.editRequested'),
		editRequestedMessage: t('myDay.leave.message.editRequested'),
		deleteRequestedToast: t('myDay.leave.toast.deleteRequested'),
		deleteRequestedMessage: t('myDay.leave.message.deleteRequested'),
		editSavedToast: t('myDay.leave.toast.editSaved'),
		editSavedMessage: t('myDay.leave.message.editSaved'),
		overlapWithOwnRequest: (status, range) => t('myDay.leave.validation.overlapWithOwnRequest', {
			status: isolateBidiText(t(leaveStatusTranslationKey(status))),
			range: isolateBidiText(range),
		}),
		requestStatusMessage: status => t('myDay.leave.message.requestStatus', {
			status: isolateBidiText(t(leaveStatusTranslationKey(status))),
		}),
	}), [t]);
}

/**
 * leaveDurationModeTranslationKey maps leave duration modes to localized labels.
 */
export function leaveDurationModeTranslationKey(mode: LeaveDurationMode): TranslationKey {
	switch (mode) {
		case 'full_day':
			return 'myDay.leave.duration.fullDay';
		case 'half_day':
			return 'myDay.leave.duration.halfDay';
		case 'hourly':
			return 'myDay.leave.duration.hourly';
	}
}

/**
 * leaveHalfDayPartTranslationKey maps half-day parts to localized labels.
 */
export function leaveHalfDayPartTranslationKey(part: LeaveHalfDayPart): TranslationKey {
	switch (part) {
		case 'morning':
			return 'myDay.leave.halfDay.morning';
		case 'afternoon':
			return 'myDay.leave.halfDay.afternoon';
	}
}

/**
 * leaveStatusTranslationKey maps leave statuses to localized labels.
 */
export function leaveStatusTranslationKey(status: LeaveStatus): TranslationKey {
	switch (status) {
		case 'pending':
			return 'myDay.leave.status.pending';
		case 'approved':
			return 'myDay.leave.status.approved';
		case 'rejected':
			return 'myDay.leave.status.rejected';
		case 'cancelled':
			return 'myDay.leave.status.cancelled';
	}
}

/**
 * formatLocalizedLeaveDurationDetails returns localized duration details without
 * translating user-entered reason/backup fields.
 */
export function formatLocalizedLeaveDurationDetails(
	leaveRequest: LeaveRequest,
	translate: (key: TranslationKey, values?: Readonly<Record<string, string | number | boolean>>) => string,
): string {
	switch (leaveRequest.durationMode) {
		case 'half_day': {
			if (leaveRequest.halfDayPart === '') {
				return translate('myDay.leave.duration.halfDay');
			}

			return translate('myDay.leave.duration.halfDayWithPart', {
				part: translate(leaveHalfDayPartTranslationKey(leaveRequest.halfDayPart)),
			});
		}

		case 'hourly':
			return translate('myDay.leave.duration.hourlyRange', {
				startTime: leaveRequest.startTime,
				endTime: leaveRequest.endTime,
			});

		case 'full_day':
			return translate('myDay.leave.duration.fullDay');
	}
}

/**
 * localizedLeaveTypeName maps built-in seed leave types while preserving custom names.
 *
 * The code field is preferred because admins may later rename the display name;
 * name matching remains as a compatibility fallback for old payloads.
 */
export function localizedLeaveTypeName(leaveType: Pick<LeaveType, 'code' | 'name'>, translate: (key: TranslationKey) => string): string {
	const normalizedCode = normalizeLeaveTypeToken(leaveType.code);
	const normalizedName = normalizeLeaveTypeToken(leaveType.name);
	const normalizedValue = normalizedCode === '' ? normalizedName : normalizedCode;

	switch (normalizedValue) {
		case 'vacation':
		case 'custom':
			return translate('myDay.leave.type.personal');
		case 'sick':
			return translate('myDay.leave.type.sick');
		case 'personal':
			return translate('myDay.leave.type.personal');
		case 'remote_wfh':
		case 'remote':
		case 'wfh':
			return translate('myDay.leave.type.remoteWfh');
		default:
			return leaveType.name;
	}
}

/**
 * isSelectableLeaveType returns whether a leave type can be used for new requests.
 * Vacation and custom are folded into Personal and hidden from new forms.
 */
export function isSelectableLeaveType(leaveType: Pick<LeaveType, 'code' | 'name'>): boolean {
	const normalizedCode = normalizeLeaveTypeToken(leaveType.code);
	const normalizedName = normalizeLeaveTypeToken(leaveType.name);
	const normalizedValue = normalizedCode === '' ? normalizedName : normalizedCode;

	return (
		normalizedValue === 'sick' ||
		normalizedValue === 'personal' ||
		normalizedValue === 'remote_wfh' ||
		normalizedValue === 'remote' ||
		normalizedValue === 'wfh'
	);
}

/**
 * normalizeLeaveTypeToken makes seed leave type matching resilient to punctuation.
 */
function normalizeLeaveTypeToken(value: string): string {
	return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}