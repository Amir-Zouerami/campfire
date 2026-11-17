import { addDays, diffInDays, eachDate, formatDate, rangesOverlap, weekdayOf } from '@/shared/lib/date';
import type { DateRange, IsoDate } from '@/shared/lib/date';
import type { WeekGridDay, WeekGridRow } from '@/shared/ui';
import type { ApprovedLeaveRequest } from '@/shared/types/domain';

/**
 * leavesOnDate lists the approved leave covering a date.
 */
export function leavesOnDate(leaves: readonly ApprovedLeaveRequest[], date: IsoDate): readonly ApprovedLeaveRequest[] {
	return leaves.filter(item => item.leaveRequest.startDate <= date && item.leaveRequest.endDate >= date);
}

/**
 * leavesInRange lists the approved leave overlapping a date range.
 */
export function leavesInRange(leaves: readonly ApprovedLeaveRequest[], range: DateRange): readonly ApprovedLeaveRequest[] {
	return leaves.filter(item => rangesOverlap(item.leaveRequest, range));
}

/**
 * isValidRange reports whether both ends are present and in order.
 */
export function isValidRange(range: DateRange): boolean {
	return range.startDate !== '' && range.endDate !== '' && range.startDate <= range.endDate;
}

/**
 * weekGridDays builds the seven column headers of a week, hatching the workspace's non-working days.
 */
export function weekGridDays(week: DateRange, workingDays: readonly number[], today: IsoDate, locale: string): readonly WeekGridDay[] {
	return eachDate(week.startDate, week.endDate).map(date => ({
		key: date,
		label: formatDate(date, locale, { weekday: 'short' }),
		sublabel: formatDate(date, locale, { day: 'numeric' }),
		off: !workingDays.includes(weekdayOf(date)),
		today: date === today,
	}));
}

/**
 * weekGridRows lays approved leave out as one row per person, with a bar across the days covered.
 */
export function weekGridRows(
	leaves: readonly ApprovedLeaveRequest[],
	week: DateRange,
	labelFor: (userID: string) => WeekGridRow['label'],
	typeLabel: (item: ApprovedLeaveRequest) => string,
): readonly WeekGridRow[] {
	const byUser = new Map<string, ApprovedLeaveRequest[]>();
	for (const item of leavesInRange(leaves, week)) {
		byUser.set(item.leaveRequest.userId, [...(byUser.get(item.leaveRequest.userId) ?? []), item]);
	}

	return [...byUser.entries()].map(([userID, items]) => ({
		key: userID,
		label: labelFor(userID),
		spans: items.map(item => {
			const start = Math.max(0, diffInDays(week.startDate, item.leaveRequest.startDate));
			const end = Math.min(6, diffInDays(week.startDate, item.leaveRequest.endDate));

			return { key: item.leaveRequest.id, start, length: end - start + 1, label: typeLabel(item), variant: 'solid' as const };
		}),
	}));
}

/**
 * defaultRange is the planning window the page opens with: today through the next 30 days.
 */
export function defaultRange(today: IsoDate): DateRange {
	return { startDate: today, endDate: addDays(today, 30) };
}
