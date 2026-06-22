import { ApiClientError } from '@/api';
import { cn } from '@/lib/utils';
import type {
	ApprovedLeaveRequest,
	GlobalSkipDate,
	StandupRunDecision,
	StandupSkipReason,
	WorkspaceOffDay,
} from '@/types/domain';

/**
 * getTodayLocalDateString returns today's local YYYY-MM-DD date.
 */
export function getTodayLocalDateString(): string {
	const today = new Date();
	const year = String(today.getFullYear());
	const month = String(today.getMonth() + 1).padStart(2, '0');
	const day = String(today.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

/**
 * collectRuntimeUserIDs returns all user IDs referenced by a runtime decision.
 */
export function collectRuntimeUserIDs(decision: StandupRunDecision | null): readonly string[] {
	if (decision === null) {
		return [];
	}

	return uniqueStrings([
		...decision.excludedUserIds,
		...decision.approvedLeaves.flatMap(row => [row.leaveRequest.userId, row.leaveRequest.backupUserId]),
	]);
}

/**
 * runtimeDecisionTone returns the status tone for a runtime decision.
 */
export function runtimeDecisionTone(decision: StandupRunDecision | null): 'green' | 'red' | 'slate' {
	if (decision === null) {
		return 'slate';
	}

	return decision.shouldRun ? 'green' : 'red';
}

/**
 * runtimeDecisionLabel returns the short decision label.
 */
export function runtimeDecisionLabel(decision: StandupRunDecision | null): string {
	if (decision === null) {
		return 'Not evaluated';
	}

	return decision.shouldRun ? 'Will run' : 'Will skip';
}

/**
 * runtimeReasonLabel returns a readable skip reason.
 */
export function runtimeReasonLabel(reason: StandupSkipReason): string {
	if (reason.trim() === '') {
		return 'No skip reason';
	}

	return formatLabel(reason);
}

/**
 * runtimeReasonDescription explains the runtime reason.
 */
export function runtimeReasonDescription(reason: StandupSkipReason): string {
	switch (reason) {
		case '':
			return 'No skip rule blocked this date. Campfire can run the standup automation.';

		case 'non_working_day':
			return 'The selected date is not enabled as a workspace working day.';

		case 'global_off_day':
			return 'The selected date matches a global off-day managed by Campfire Admins.';

		case 'workspace_off_day':
			return 'The selected date matches a workspace-specific off-day.';

		case 'everyone_on_leave':
			return 'Every active standup participant is on approved leave for this date.';

		case 'no_participants':
			return 'There are no current channel members included in standups after exclusions are applied.';
	}
}

/**
 * formatLeaveRange returns a compact leave date range.
 */
export function formatLeaveRange(leave: ApprovedLeaveRequest): string {
	const request = leave.leaveRequest;

	if (request.startDate === request.endDate) {
		return request.startDate;
	}

	return `${request.startDate} → ${request.endDate}`;
}

/**
 * formatLeaveDuration returns duration-specific leave details.
 */
export function formatLeaveDuration(leave: ApprovedLeaveRequest): string {
	const request = leave.leaveRequest;

	switch (request.durationMode) {
		case 'half_day':
			return request.halfDayPart === '' ? 'Half day' : `Half day · ${formatLabel(request.halfDayPart)}`;

		case 'hourly':
			return `${request.startTime} → ${request.endTime}`;

		case 'full_day':
			return 'Full day';
	}
}

/**
 * formatGlobalOffDay returns a compact global off-day label.
 */
export function formatGlobalOffDay(offDay: GlobalSkipDate): string {
	return `${offDay.date} · ${offDay.label}`;
}

/**
 * formatWorkspaceOffDay returns a compact workspace off-day label.
 */
export function formatWorkspaceOffDay(offDay: WorkspaceOffDay): string {
	return `${offDay.date} · ${offDay.label}`;
}

/**
 * formatDateTime formats an API timestamp for compact display.
 */
export function formatDateTime(value: string): string {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return date.toLocaleString();
}

/**
 * runtimeSignalCardClassName returns the card style for runtime signal rows.
 */
export function runtimeSignalCardClassName(active: boolean): string {
	return cn(
		'cf:min-h-[8.5rem] cf:rounded-2xl cf:border cf:p-5 cf:transition',
		'cf:shadow-inner cf:shadow-black/10',
		active ? 'cf:border-amber-300/30 cf:bg-amber-300/[0.08]' : 'cf:border-white/10 cf:bg-white/[0.035]',
	);
}

/**
 * errorToMessage converts unknown thrown values into a safe UI message.
 */
export function errorToMessage(error: unknown, fallbackMessage: string): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return fallbackMessage;
}

/**
 * uniqueStrings returns unique non-empty strings.
 */
function uniqueStrings(values: readonly string[]): readonly string[] {
	return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

/**
 * formatLabel converts enum-like values to readable labels.
 */
function formatLabel(value: string): string {
	return value
		.split('_')
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}
