import type { TFunction } from '@/shared/i18n';
import type { StandupRunDecision, StandupSkipReason } from '@/shared/types/domain';

/**
 * reasonLabel translates why a standup is skipped.
 */
export function reasonLabel(t: TFunction, reason: StandupSkipReason): string {
	switch (reason) {
		case 'non_working_day':
			return t('teamReview.runtime.reason.nonWorkingDay');
		case 'global_off_day':
			return t('teamReview.runtime.reason.globalOffDay');
		case 'workspace_off_day':
			return t('teamReview.runtime.reason.workspaceOffDay');
		case 'everyone_on_leave':
			return t('teamReview.runtime.reason.everyoneOnLeave');
		case 'no_participants':
			return t('teamReview.runtime.reason.noParticipants');
		default:
			return t('teamReview.runtime.reason.none');
	}
}

/**
 * reasonDescription explains a skip reason in a sentence.
 */
export function reasonDescription(t: TFunction, reason: StandupSkipReason): string {
	switch (reason) {
		case 'non_working_day':
			return t('teamReview.runtime.reasonDescription.nonWorkingDay');
		case 'global_off_day':
			return t('teamReview.runtime.reasonDescription.globalOffDay');
		case 'workspace_off_day':
			return t('teamReview.runtime.reasonDescription.workspaceOffDay');
		case 'everyone_on_leave':
			return t('teamReview.runtime.reasonDescription.everyoneOnLeave');
		case 'no_participants':
			return t('teamReview.runtime.reasonDescription.noParticipants');
		default:
			return t('teamReview.runtime.reasonDescription.none');
	}
}

/**
 * Signal is one input the runtime weighs, shown as a checklist.
 */
export type Signal = {
	readonly label: string;
	/** True when this input is what stops (or would stop) the standup. */
	readonly affectsDecision: boolean;
};

/**
 * decisionSignals lists the inputs behind a decision and which of them block it.
 */
export function decisionSignals(t: TFunction, decision: StandupRunDecision): readonly Signal[] {
	return [
		{ label: t('teamReview.runtime.signal.workingDay'), affectsDecision: !decision.isWorkingDay },
		{ label: t('teamReview.runtime.signal.globalOffDays'), affectsDecision: decision.globalOffDays.length > 0 },
		{ label: t('teamReview.runtime.signal.workspaceOffDays'), affectsDecision: decision.workspaceOffDays.length > 0 },
		{ label: t('teamReview.runtime.signal.leaveCoverage'), affectsDecision: decision.reason === 'everyone_on_leave' },
		{ label: t('teamReview.runtime.signal.excluded'), affectsDecision: decision.reason === 'no_participants' },
	];
}
