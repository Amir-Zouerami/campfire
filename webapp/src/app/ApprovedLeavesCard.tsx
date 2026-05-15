import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';

import { ApiClientError, listApprovedLeaveRequests } from '../api/client';
import type { ApprovedLeaveRequest, Workspace } from '../types/domain';

/**
 * ApprovedLeavesCardProps contains workspace and refresh data.
 */
type ApprovedLeavesCardProps = {
	readonly workspace: Workspace;
	readonly refreshToken: number;
};

/**
 * LoadState describes the approved leave calendar loading status.
 */
type LoadState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * ApprovedLeavesCard renders approved leave rows for a date window.
 */
export function ApprovedLeavesCard(props: ApprovedLeavesCardProps): ReactElement {
	const today = getTodayLocalDateString();
	const [startDate, setStartDate] = useState(today);
	const [endDate, setEndDate] = useState(() => addDaysToLocalDate(today, 30));
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [leaveRequests, setLeaveRequests] = useState<readonly ApprovedLeaveRequest[]>([]);
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		async function loadApprovedLeaves(): Promise<void> {
			if (startDate.trim() === '' || endDate.trim() === '') {
				setMessage('Choose a start and end date.');
				return;
			}

			setLoadState('loading');
			setMessage('');

			try {
				const response = await listApprovedLeaveRequests(props.workspace.id, startDate, endDate);

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

		void loadApprovedLeaves();

		return () => {
			isActive = false;
		};
	}, [props.workspace.id, startDate, endDate, props.refreshToken]);

	return (
		<section className="cf:mt-5 cf:rounded-3xl cf:border cf:border-violet-300/20 cf:bg-white/[0.055] cf:p-6 cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
			<div className="cf:grid cf:gap-5 cf:lg:grid-cols-[1fr_auto] cf:lg:items-start">
				<div>
					<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-violet-200">
						Calendar
					</p>
					<h2 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
						Approved leave calendar
					</h2>
					<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">
						Approved leave in this date window. This data will feed standup scheduling, daily availability,
						and future reports.
					</p>
				</div>

				<div className="cf:w-fit cf:rounded-full cf:border cf:border-violet-300/25 cf:bg-violet-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-violet-200">
					{leaveRequests.length} approved
				</div>
			</div>

			<div className="cf:mt-5 cf:grid cf:gap-4 cf:md:grid-cols-[1fr_1fr_auto] cf:md:items-end">
				<Field label="Start date">
					<input
						className={inputClassName}
						type="date"
						value={startDate}
						onChange={event => setStartDate(event.currentTarget.value)}
					/>
				</Field>

				<Field label="End date">
					<input
						className={inputClassName}
						type="date"
						value={endDate}
						onChange={event => setEndDate(event.currentTarget.value)}
					/>
				</Field>

				<button
					className="cf:w-fit cf:rounded-2xl cf:border cf:border-violet-300/25 cf:bg-violet-400/20 cf:px-5 cf:py-3 cf:font-black cf:text-violet-50 cf:transition cf:hover:bg-violet-400/30"
					type="button"
					onClick={() => setEndDate(addDaysToLocalDate(getTodayLocalDateString(), 30))}
				>
					Next 30 days
				</button>
			</div>

			{message !== '' && <p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{message}</p>}

			<div className="cf:mt-5 cf:grid cf:gap-4">
				{loadState === 'loading' && <p className="cf:m-0 cf:text-slate-300">Loading approved leave…</p>}

				{loadState !== 'loading' && leaveRequests.length === 0 && (
					<p className="cf:m-0 cf:text-slate-300">No approved leave in this date range.</p>
				)}

				{leaveRequests.map(item => (
					<article
						className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4"
						key={item.leaveRequest.id}
					>
						<div className="cf:flex cf:flex-col cf:gap-3 cf:sm:flex-row cf:sm:items-start cf:sm:justify-between">
							<div>
								<strong className="cf:block cf:text-lg cf:font-black cf:text-white">
									{item.leaveTypeName}
								</strong>
								<p className="cf:m-0 cf:mt-1 cf:text-sm cf:text-slate-300">
									{item.leaveRequest.startDate} → {item.leaveRequest.endDate}
									{formatDurationDetails(item)}
								</p>
								<p className="cf:m-0 cf:mt-1 cf:text-xs cf:font-bold cf:text-slate-400">
									User {item.leaveRequest.userId}
								</p>
							</div>

							<span className="cf:w-fit cf:rounded-full cf:border cf:border-emerald-300/20 cf:bg-emerald-300/10 cf:px-3 cf:py-1 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-emerald-200">
								{item.leaveRequest.status}
							</span>
						</div>

						{item.leaveRequest.reason !== '' && (
							<p className="cf:m-0 cf:mt-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-3 cf:text-sm cf:leading-6 cf:text-slate-200">
								{item.leaveRequest.reason}
							</p>
						)}
					</article>
				))}
			</div>
		</section>
	);
}

const inputClassName =
	'cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/55 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:transition cf:[color-scheme:dark] cf:placeholder:text-slate-500 cf:focus:border-violet-300/60 cf:focus:ring-4 cf:focus:ring-violet-300/15';

/**
 * Field renders a labeled form control.
 */
function Field(props: { readonly label: string; readonly children: ReactElement }): ReactElement {
	return (
		<label className="cf:grid cf:gap-2">
			<span className="cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.14em] cf:text-violet-200">
				{props.label}
			</span>
			{props.children}
		</label>
	);
}

/**
 * formatDurationDetails returns compact duration-specific display text.
 */
function formatDurationDetails(item: ApprovedLeaveRequest): string {
	const request = item.leaveRequest;

	switch (request.durationMode) {
		case 'half_day':
			return request.halfDayPart === '' ? ' · half day' : ` · half day · ${request.halfDayPart}`;

		case 'hourly':
			return ` · ${request.startTime} → ${request.endTime}`;

		case 'full_day':
			return '';

		default:
			return '';
	}
}

/**
 * getTodayLocalDateString returns today's local YYYY-MM-DD date.
 */
function getTodayLocalDateString(): string {
	return dateToLocalDateString(new Date());
}

/**
 * addDaysToLocalDate adds days to a YYYY-MM-DD local date string.
 */
function addDaysToLocalDate(localDate: string, days: number): string {
	const parts = localDate.split('-');

	if (parts.length !== 3) {
		return getTodayLocalDateString();
	}

	const year = Number(parts[0]);
	const month = Number(parts[1]);
	const day = Number(parts[2]);

	if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
		return getTodayLocalDateString();
	}

	return dateToLocalDateString(new Date(year, month - 1, day + days));
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
 * errorToMessage converts unknown thrown values into a safe UI message.
 */
function errorToMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return 'Could not load approved leave.';
}
