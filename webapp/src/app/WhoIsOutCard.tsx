import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Loader2, Umbrella, Users } from 'lucide-react';

import { ApiClientError, listApprovedLeaveRequests } from '@/api';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { ApprovedLeaveRequest, Workspace } from '@/types/domain';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireEmpty,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from './campfire-ui';
import { useUserProfiles } from './useUserProfiles';

/**
 * WhoIsOutCardProps contains workspace and refresh inputs.
 */
type WhoIsOutCardProps = {
	readonly workspace: Workspace;
	readonly refreshToken: number;
};

/**
 * LoadState describes the who-is-out card loading state.
 */
type LoadState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * WhoIsOutCard shows approved absences for today and the current week.
 */
export function WhoIsOutCard(props: WhoIsOutCardProps): ReactElement {
	const today = getTodayLocalDateString();
	const weekRange = getCurrentWeekRange(today);

	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [leaveRequests, setLeaveRequests] = useState<readonly ApprovedLeaveRequest[]>([]);
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * Loads approved leaves overlapping the current local week.
		 */
		async function loadWhoIsOut(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const response = await listApprovedLeaveRequests(
					props.workspace.id,
					weekRange.startDate,
					weekRange.endDate,
				);

				if (!isActive) {
					return;
				}

				setLeaveRequests(response.leaveRequests);
				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setMessage(errorToMessage(error));
				setLoadState('error');
			}
		}

		void loadWhoIsOut();

		return () => {
			isActive = false;
		};
	}, [props.workspace.id, props.refreshToken, weekRange.startDate, weekRange.endDate]);

	const todayLeaves = useMemo(
		() => leaveRequests.filter(row => coversDate(row.leaveRequest.startDate, row.leaveRequest.endDate, today)),
		[leaveRequests, today],
	);

	const weekLeaves = useMemo(
		() =>
			leaveRequests.filter(row =>
				overlapsDateRange(
					row.leaveRequest.startDate,
					row.leaveRequest.endDate,
					weekRange.startDate,
					weekRange.endDate,
				),
			),
		[leaveRequests, weekRange.startDate, weekRange.endDate],
	);

	const userIDsForProfiles = useMemo(() => collectLeaveUserIDs(weekLeaves), [weekLeaves]);
	const {
		errorMessage: profileErrorMessage,
		labelForUserID,
		loading: profilesLoading,
	} = useUserProfiles(userIDsForProfiles);

	return (
		<CampfirePanel className="cf:overflow-hidden">
			<CampfireCardHeader
				eyebrow="Availability"
				title="Who is out"
				description="Approved leave for today and this week. These users should not be counted as missing for standups."
				icon={Umbrella}
				action={
					<div className="cf:flex cf:flex-wrap cf:gap-2">
						<CampfireStatusPill tone="green">Today: {todayLeaves.length}</CampfireStatusPill>
						<CampfireStatusPill tone="ember">Week: {weekLeaves.length}</CampfireStatusPill>
					</div>
				}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
				<div className="cf:grid cf:gap-3 cf:md:grid-cols-3">
					<CampfireMetric
						label="Today"
						value={String(todayLeaves.length)}
						helper={today}
						icon={CalendarDays}
					/>
					<CampfireMetric
						label="This week"
						value={String(weekLeaves.length)}
						helper={`${weekRange.startDate} → ${weekRange.endDate}`}
						icon={Users}
					/>
					<CampfireMetric
						label="Profiles"
						value={profilesLoading ? 'Loading' : 'Ready'}
						helper="Resolved display names"
					/>
				</div>

				{message !== '' && <MessageRow tone="red" message={message} />}
				{profileErrorMessage !== '' && <MessageRow tone="amber" message={profileErrorMessage} />}
				{profilesLoading && <LoadingRow label="Resolving user names…" />}

				<Separator className="cf:bg-white/10" />

				<div className="cf:grid cf:gap-5 cf:xl:grid-cols-2">
					<LeaveGroup
						emptyMessage="No one is out today."
						leaves={todayLeaves}
						title={`Today · ${today}`}
						labelForUserID={labelForUserID}
					/>

					<LeaveGroup
						emptyMessage="No approved leave this week."
						leaves={weekLeaves}
						title={`This week · ${weekRange.startDate} → ${weekRange.endDate}`}
						labelForUserID={labelForUserID}
					/>
				</div>

				{loadState === 'loading' && <LoadingRow label="Loading availability…" />}
				{loadState === 'error' && message === '' && (
					<MessageRow tone="amber" message="Could not load availability." />
				)}
			</CampfireCardBody>
		</CampfirePanel>
	);
}

/**
 * LeaveGroup renders one who-is-out list.
 */
function LeaveGroup(props: {
	readonly title: string;
	readonly leaves: readonly ApprovedLeaveRequest[];
	readonly emptyMessage: string;
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	return (
		<div className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3">
				<h3 className="cf:text-lg cf:font-black cf:text-white">{props.title}</h3>
				<Badge variant="secondary" className="cf:rounded-full">
					{props.leaves.length}
				</Badge>
			</div>

			<div className="cf:mt-4 cf:grid cf:gap-3">
				{props.leaves.length === 0 && (
					<CampfireEmpty
						icon={Umbrella}
						title={props.emptyMessage}
						description="No approved absence rows match this window."
					/>
				)}

				{props.leaves.map(row => (
					<LeaveRow row={row} labelForUserID={props.labelForUserID} key={row.leaveRequest.id} />
				))}
			</div>
		</div>
	);
}

/**
 * LeaveRow renders one approved leave row.
 */
function LeaveRow(props: {
	readonly row: ApprovedLeaveRequest;
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	return (
		<article className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-4">
			<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3">
				<strong className="cf:text-base cf:font-black cf:text-white" title={props.row.leaveRequest.userId}>
					{props.labelForUserID(props.row.leaveRequest.userId)}
				</strong>

				<span className="cf:rounded-full cf:border cf:border-sky-300/20 cf:bg-sky-300/10 cf:px-3 cf:py-1 cf:text-xs cf:font-black cf:text-sky-100">
					{props.row.leaveTypeName}
				</span>
			</div>

			<p className="cf:mt-3 cf:text-sm cf:font-bold cf:text-slate-300">
				{props.row.leaveRequest.startDate} → {props.row.leaveRequest.endDate}
			</p>

			<div className="cf:mt-3 cf:flex cf:flex-wrap cf:gap-2">
				<span className="cf:rounded-full cf:border cf:border-white/10 cf:bg-slate-950/50 cf:px-2.5 cf:py-1 cf:text-xs cf:font-bold cf:text-slate-300">
					{formatLabel(props.row.leaveRequest.durationMode)}
				</span>

				{props.row.leaveRequest.backupUserId !== '' && (
					<span
						className="cf:rounded-full cf:border cf:border-emerald-300/20 cf:bg-emerald-300/10 cf:px-2.5 cf:py-1 cf:text-xs cf:font-bold cf:text-emerald-100"
						title={props.row.leaveRequest.backupUserId}
					>
						Backup: {props.labelForUserID(props.row.leaveRequest.backupUserId)}
					</span>
				)}
			</div>
		</article>
	);
}

/**
 * MessageRow renders a status/error row.
 */
function MessageRow(props: { readonly tone: 'amber' | 'red'; readonly message: string }): ReactElement {
	return (
		<div
			className={
				props.tone === 'red'
					? 'cf:rounded-2xl cf:border cf:border-red-300/25 cf:bg-red-950/30 cf:px-4 cf:py-3 cf:text-sm cf:font-black cf:text-red-100'
					: 'cf:rounded-2xl cf:border cf:border-amber-300/25 cf:bg-amber-950/30 cf:px-4 cf:py-3 cf:text-sm cf:font-black cf:text-amber-100'
			}
		>
			{props.message}
		</div>
	);
}

/**
 * LoadingRow renders a loading message.
 */
function LoadingRow(props: { readonly label: string }): ReactElement {
	return (
		<div className="cf:flex cf:items-center cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-4 cf:text-sm cf:font-bold cf:text-slate-300">
			<Loader2 className="cf:size-4 cf:animate-spin cf:text-amber-200" />
			{props.label}
		</div>
	);
}

/**
 * collectLeaveUserIDs returns user IDs referenced by approved leave rows.
 */
function collectLeaveUserIDs(leaves: readonly ApprovedLeaveRequest[]): readonly string[] {
	const userIDs: string[] = [];

	for (const row of leaves) {
		userIDs.push(row.leaveRequest.userId);

		if (row.leaveRequest.backupUserId.trim() !== '') {
			userIDs.push(row.leaveRequest.backupUserId);
		}
	}

	return userIDs;
}

/**
 * coversDate returns true when one inclusive date range contains a date.
 */
function coversDate(startDate: string, endDate: string, date: string): boolean {
	return startDate <= date && endDate >= date;
}

/**
 * overlapsDateRange returns true when two inclusive local-date ranges overlap.
 */
function overlapsDateRange(startDate: string, endDate: string, rangeStart: string, rangeEnd: string): boolean {
	return startDate <= rangeEnd && endDate >= rangeStart;
}

/**
 * getCurrentWeekRange returns a Monday-to-Sunday local week range.
 */
function getCurrentWeekRange(today: string): { readonly startDate: string; readonly endDate: string } {
	const parts = today.split('-');

	if (parts.length !== 3) {
		return {
			startDate: today,
			endDate: today,
		};
	}

	const year = Number(parts[0]);
	const month = Number(parts[1]);
	const day = Number(parts[2]);

	if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
		return {
			startDate: today,
			endDate: today,
		};
	}

	const date = new Date(year, month - 1, day);
	const weekday = date.getDay();
	const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
	const sundayOffset = mondayOffset + 6;

	return {
		startDate: dateToLocalDateString(new Date(year, month - 1, day + mondayOffset)),
		endDate: dateToLocalDateString(new Date(year, month - 1, day + sundayOffset)),
	};
}

/**
 * getTodayLocalDateString returns today's local YYYY-MM-DD date.
 */
function getTodayLocalDateString(): string {
	return dateToLocalDateString(new Date());
}

/**
 * dateToLocalDateString formats a Date as local YYYY-MM-DD.
 */
function dateToLocalDateString(date: Date): string {
	const year = String(date.getFullYear());
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

/**
 * formatLabel converts enum-like strings to human-readable labels.
 */
function formatLabel(value: string): string {
	return value
		.split('_')
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

/**
 * errorToMessage converts unknown thrown values into a safe UI message.
 */
function errorToMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return 'Could not load who is out.';
}
