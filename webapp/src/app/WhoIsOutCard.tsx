import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { useUserProfiles } from './useUserProfiles';
import { ApiClientError, listApprovedLeaveRequests } from '../api/client';
import type { ApprovedLeaveRequest, Workspace } from '../types/domain';

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
		<section className="cf:mt-5 cf:rounded-3xl cf:border cf:border-sky-300/20 cf:bg-white/[0.055] cf:p-6 cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
			<div className="cf:grid cf:gap-5 cf:lg:grid-cols-[1fr_auto] cf:lg:items-start">
				<div>
					<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-sky-200">
						Availability
					</p>
					<h2 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
						Who is out
					</h2>
					<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">
						Approved leave for today and this week. These users should not be counted as missing for
						standups.
					</p>
				</div>

				<div className="cf:flex cf:flex-wrap cf:gap-2">
					<span className="cf:rounded-full cf:border cf:border-sky-300/25 cf:bg-sky-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-sky-100">
						Today: {todayLeaves.length}
					</span>
					<span className="cf:rounded-full cf:border cf:border-violet-300/25 cf:bg-violet-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-violet-100">
						Week: {weekLeaves.length}
					</span>
				</div>
			</div>

			{message !== '' && <p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{message}</p>}
			{profileErrorMessage !== '' && (
				<p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{profileErrorMessage}</p>
			)}
			{profilesLoading && (
				<p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-slate-300">Resolving user names…</p>
			)}

			<div className="cf:mt-5 cf:grid cf:gap-5 cf:xl:grid-cols-2">
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

			{loadState === 'loading' && <p className="cf:m-0 cf:mt-4 cf:text-slate-300">Loading availability…</p>}
			{loadState === 'error' && message === '' && (
				<p className="cf:m-0 cf:mt-4 cf:text-amber-300">Could not load availability.</p>
			)}
		</section>
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
			<h3 className="cf:m-0 cf:text-lg cf:font-black cf:text-white">{props.title}</h3>

			<div className="cf:mt-4 cf:grid cf:gap-3">
				{props.leaves.length === 0 && (
					<p className="cf:m-0 cf:rounded-2xl cf:border cf:border-dashed cf:border-white/10 cf:p-4 cf:text-slate-300">
						{props.emptyMessage}
					</p>
				)}

				{props.leaves.map(row => (
					<article
						className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-4"
						key={row.leaveRequest.id}
					>
						<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3">
							<strong
								className="cf:text-base cf:font-black cf:text-white"
								title={row.leaveRequest.userId}
							>
								{props.labelForUserID(row.leaveRequest.userId)}
							</strong>

							<span className="cf:rounded-full cf:border cf:border-sky-300/20 cf:bg-sky-300/10 cf:px-3 cf:py-1 cf:text-xs cf:font-extrabold cf:text-sky-100">
								{row.leaveTypeName}
							</span>
						</div>

						<p className="cf:m-0 cf:mt-2 cf:text-sm cf:font-bold cf:text-slate-300">
							{row.leaveRequest.startDate} → {row.leaveRequest.endDate}
						</p>

						<div className="cf:mt-2 cf:flex cf:flex-wrap cf:gap-2">
							<span className="cf:rounded-full cf:border cf:border-white/10 cf:bg-slate-950/50 cf:px-2.5 cf:py-1 cf:text-xs cf:font-bold cf:text-slate-300">
								{formatLabel(row.leaveRequest.durationMode)}
							</span>

							{row.leaveRequest.backupUserId !== '' && (
								<span
									className="cf:rounded-full cf:border cf:border-emerald-300/20 cf:bg-emerald-300/10 cf:px-2.5 cf:py-1 cf:text-xs cf:font-bold cf:text-emerald-100"
									title={row.leaveRequest.backupUserId}
								>
									Backup: {props.labelForUserID(row.leaveRequest.backupUserId)}
								</span>
							)}
						</div>
					</article>
				))}
			</div>
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
