import type { TFunction } from '@/shared/i18n';
import type { IsoDate } from '@/shared/lib/date';
import type { StandupRunDecision, StandupSchedule, StandupTemplate } from '@/shared/types/domain';

/**
 * scheduleAllowsDate reports whether a schedule can be used for the evaluated date.
 * A schedule only runs when the runtime says the day runs; weekly schedules additionally
 * only run on the last working day of the week.
 */
export function scheduleAllowsDate(schedule: StandupSchedule, decision: StandupRunDecision | undefined): boolean {
	if (!schedule.enabled || decision?.shouldRun !== true) {
		return false;
	}

	return schedule.kind === 'weekly' ? decision.isLastWorkingDayOfWeek : true;
}

/**
 * availableSchedules lists the enabled schedules, with an existing template, that run on the date.
 */
export function availableSchedules(
	schedules: readonly StandupSchedule[],
	templates: readonly StandupTemplate[],
	decision: StandupRunDecision | undefined,
): readonly StandupSchedule[] {
	const templateIDs = new Set(templates.map(template => template.id));

	return schedules.filter(schedule => templateIDs.has(schedule.templateId) && scheduleAllowsDate(schedule, decision));
}

/**
 * BlockedReason explains why a standup cannot be submitted for the chosen date.
 */
export type BlockedReason = {
	readonly message: string;
	/** The member is on approved leave, which gets its own heading. */
	readonly onLeave: boolean;
};

type BlockedInput = {
	readonly date: IsoDate;
	readonly today: IsoDate;
	readonly decision: StandupRunDecision | undefined;
	readonly schedules: readonly StandupSchedule[];
	readonly userID: string;
};

/**
 * blockedReason returns why the date cannot be submitted, or null when it can.
 * Past dates stay editable so members can correct earlier standups; future dates, off days,
 * non-working days and approved leave are blocked, matching the backend's rules.
 */
export function blockedReason(input: BlockedInput, t: TFunction): BlockedReason | null {
	if (input.date.trim() === '') {
		return { message: t('myDay.standup.error.chooseDate'), onLeave: false };
	}

	if (input.date > input.today) {
		return { message: t('myDay.standup.error.futureDate'), onLeave: false };
	}

	const onLeave = input.decision?.approvedLeaves.some(leave => leave.leaveRequest.userId === input.userID) ?? false;
	if (onLeave) {
		return { message: t('myDay.standup.error.onApprovedLeave'), onLeave: true };
	}

	if (input.decision !== undefined && !input.decision.shouldRun) {
		return { message: input.decision.message || t('myDay.standup.error.notRunning'), onLeave: false };
	}

	if (input.decision?.shouldRun === true && input.schedules.length === 0) {
		return { message: t('myDay.standup.error.noScheduleForDate'), onLeave: false };
	}

	return null;
}
