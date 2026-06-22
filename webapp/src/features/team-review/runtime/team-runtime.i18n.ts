import type { TranslationKey, TranslationValues } from '@/i18n';
import type { StandupRunDecision, StandupSkipReason } from '@/types/domain';

type RuntimeTranslate = (key: TranslationKey, values?: TranslationValues) => string;

/**
 * runtimeDecisionLabel returns the localized runtime decision label.
 */
export function runtimeDecisionLabel(
	decision: StandupRunDecision | null,
	t: RuntimeTranslate,
): string {
	if (decision === null) {
		return t('teamReview.runtime.decision.notEvaluated');
	}

	return decision.shouldRun
		? t('teamReview.runtime.decision.willRun')
		: t('teamReview.runtime.decision.willSkip');
}

/**
 * runtimeDecisionBadgeLabel returns the compact localized decision badge.
 */
export function runtimeDecisionBadgeLabel(
	decision: StandupRunDecision,
	t: RuntimeTranslate,
): string {
	return decision.shouldRun
		? t('teamReview.runtime.badge.run')
		: t('teamReview.runtime.badge.skip');
}

/**
 * runtimeReasonLabel returns a localized skip reason label.
 */
export function runtimeReasonLabel(reason: StandupSkipReason, t: RuntimeTranslate): string {
	switch (reason) {
		case '':
			return t('teamReview.runtime.reason.none');
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
	}
}

/**
 * runtimeReasonDescription explains the localized runtime reason.
 */
export function runtimeReasonDescription(reason: StandupSkipReason, t: RuntimeTranslate): string {
	switch (reason) {
		case '':
			return t('teamReview.runtime.reasonDescription.none');
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
	}
}

/**
 * runtimeFallbackMessage returns a localized message when the backend message is empty.
 */
export function runtimeFallbackMessage(decision: StandupRunDecision, t: RuntimeTranslate): string {
	return decision.shouldRun
		? t('teamReview.runtime.message.runFallback')
		: t('teamReview.runtime.message.skipFallback');
}

/**
 * runtimeSignalStateLabel returns the localized signal impact label.
 */
export function runtimeSignalStateLabel(active: boolean, t: RuntimeTranslate): string {
	return active
		? t('teamReview.runtime.signal.affectsDecision')
		: t('teamReview.runtime.signal.clear');
}
