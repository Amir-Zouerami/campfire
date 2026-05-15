import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';

import { ApiClientError, evaluateStandupDay } from '../api/client';
import type { ApprovedLeaveRequest, StandupRunDecision, Workspace } from '../types/domain';

/**
 * StandupRuntimeCardProps contains workspace and refresh data.
 */
type StandupRuntimeCardProps = {
	readonly workspace: Workspace;
	readonly refreshToken: number;
};

/**
 * LoadState describes the standup runtime card loading state.
 */
type LoadState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * StandupRuntimeCard shows whether Campfire should run standup for a selected date.
 */
export function StandupRuntimeCard(props: StandupRuntimeCardProps): ReactElement {
	const [date, setDate] = useState(getTodayLocalDateString());
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [decision, setDecision] = useState<StandupRunDecision | null>(null);
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		async function loadDecision(): Promise<void> {
			if (date.trim() === '') {
				setMessage('Choose a date.');
				return;
			}

			setLoadState('loading');
			setMessage('');

			try {
				const response = await evaluateStandupDay(props.workspace.id, date);

				if (!isActive) {
					return;
				}

				setDecision(response.decision);
				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setMessage(errorToMessage(error));
				setLoadState('error');
			}
		}

		void loadDecision();

		return () => {
			isActive = false;
		};
	}, [props.workspace.id, props.refreshToken, date]);

	return (
		<section className="cf:mt-5 cf:rounded-3xl cf:border cf:border-orange-300/20 cf:bg-white/[0.055] cf:p-6 cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
			<div className="cf:grid cf:gap-5 cf:lg:grid-cols-[1fr_auto] cf:lg:items-start">
				<div>
					<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-orange-200">
						Runtime
					</p>
					<h2 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
						Standup run decision
					</h2>
					<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">
						Campfire checks working days, global off-days, workspace off-days, approved leave, and whether
						everyone in the channel is away.
					</p>
				</div>

				{decision !== null && (
					<div className={decisionBadgeClassName(decision.shouldRun)}>
						{decision.shouldRun ? 'Will run' : 'Will skip'}
					</div>
				)}
			</div>

			<div className="cf:mt-5 cf:grid cf:gap-4 cf:md:grid-cols-[1fr_auto] cf:md:items-end">
				<label className="cf:grid cf:gap-2">
					<span className="cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.14em] cf:text-orange-200">
						Date
					</span>
					<input
						className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/55 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:transition cf:[color-scheme:dark] cf:focus:border-orange-300/60 cf:focus:ring-4 cf:focus:ring-orange-300/15"
						type="date"
						value={date}
						onChange={event => setDate(event.currentTarget.value)}
					/>
				</label>

				<button
					className="cf:w-fit cf:rounded-2xl cf:border cf:border-orange-300/25 cf:bg-orange-400/20 cf:px-5 cf:py-3 cf:font-black cf:text-orange-50 cf:transition cf:hover:bg-orange-400/30"
					type="button"
					onClick={() => setDate(getTodayLocalDateString())}
				>
					Today
				</button>
			</div>

			{message !== '' && <p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{message}</p>}

			{loadState === 'loading' && <p className="cf:m-0 cf:mt-5 cf:text-slate-300">Evaluating standup runtime…</p>}

			{decision !== null && (
				<div className="cf:mt-5 cf:grid cf:gap-4">
					<article className={decisionPanelClassName(decision.shouldRun)}>
						<strong className="cf:block cf:text-lg cf:font-black cf:text-white">
							{decision.shouldRun ? 'Standup should run' : 'Standup should be skipped'}
						</strong>
						<p className="cf:m-0 cf:mt-2 cf:leading-7 cf:text-slate-200">{decision.message}</p>
						{decision.reason !== '' && (
							<p className="cf:m-0 cf:mt-2 cf:text-sm cf:font-bold cf:text-slate-300">
								Reason: {decision.reason}
							</p>
						)}
					</article>

					<div className="cf:grid cf:gap-3 cf:md:grid-cols-4">
						<RuntimeMetric label="Working day" value={decision.isWorkingDay ? 'Yes' : 'No'} />
						<RuntimeMetric label="Members" value={String(decision.memberCount)} />
						<RuntimeMetric label="On leave" value={String(decision.onLeaveMemberCount)} />
						<RuntimeMetric label="Approved leaves" value={String(decision.approvedLeaves.length)} />
					</div>

					<RuntimeList
						title="Global off-days"
						emptyText="No global off-day on this date."
						items={decision.globalOffDays.map(offDay => `${offDay.date} · ${offDay.label}`)}
					/>

					<RuntimeList
						title="Workspace off-days"
						emptyText="No workspace off-day on this date."
						items={decision.workspaceOffDays.map(offDay => `${offDay.date} · ${offDay.label}`)}
					/>

					<ApprovedLeaveList leaves={decision.approvedLeaves} />
				</div>
			)}
		</section>
	);
}

/**
 * RuntimeMetric renders one compact runtime metric.
 */
function RuntimeMetric(props: { readonly label: string; readonly value: string }): ReactElement {
	return (
		<div className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/35 cf:p-4">
			<span className="cf:block cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.14em] cf:text-orange-200">
				{props.label}
			</span>
			<strong className="cf:mt-1 cf:block cf:text-lg cf:font-black cf:text-white">{props.value}</strong>
		</div>
	);
}

/**
 * RuntimeList renders simple runtime string rows.
 */
function RuntimeList(props: {
	readonly title: string;
	readonly emptyText: string;
	readonly items: readonly string[];
}): ReactElement {
	return (
		<article className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/35 cf:p-4">
			<strong className="cf:block cf:text-base cf:font-black cf:text-white">{props.title}</strong>

			{props.items.length === 0 && (
				<p className="cf:m-0 cf:mt-2 cf:text-sm cf:text-slate-300">{props.emptyText}</p>
			)}

			{props.items.length > 0 && (
				<ul className="cf:m-0 cf:mt-3 cf:grid cf:list-none cf:gap-2 cf:p-0">
					{props.items.map(item => (
						<li
							className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:px-3 cf:py-2 cf:text-sm cf:text-slate-200"
							key={item}
						>
							{item}
						</li>
					))}
				</ul>
			)}
		</article>
	);
}

/**
 * ApprovedLeaveList renders approved leave rows affecting runtime.
 */
function ApprovedLeaveList(props: { readonly leaves: readonly ApprovedLeaveRequest[] }): ReactElement {
	return (
		<article className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/35 cf:p-4">
			<strong className="cf:block cf:text-base cf:font-black cf:text-white">Approved leave on this date</strong>

			{props.leaves.length === 0 && (
				<p className="cf:m-0 cf:mt-2 cf:text-sm cf:text-slate-300">No approved leave overlaps this date.</p>
			)}

			{props.leaves.length > 0 && (
				<div className="cf:mt-3 cf:grid cf:gap-3">
					{props.leaves.map(leave => (
						<div
							className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-3"
							key={leave.leaveRequest.id}
						>
							<strong className="cf:block cf:text-sm cf:font-black cf:text-white">
								{leave.leaveTypeName}
							</strong>
							<p className="cf:m-0 cf:mt-1 cf:text-sm cf:text-slate-300">
								User {leave.leaveRequest.userId} · {leave.leaveRequest.startDate} →{' '}
								{leave.leaveRequest.endDate}
								{formatDurationDetails(leave)}
							</p>
						</div>
					))}
				</div>
			)}
		</article>
	);
}

/**
 * decisionBadgeClassName returns the status badge style for a run decision.
 */
function decisionBadgeClassName(shouldRun: boolean): string {
	const baseClassName =
		'cf:w-fit cf:rounded-full cf:border cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em]';

	if (shouldRun) {
		return `${baseClassName} cf:border-emerald-300/25 cf:bg-emerald-300/10 cf:text-emerald-200`;
	}

	return `${baseClassName} cf:border-amber-300/25 cf:bg-amber-300/10 cf:text-amber-200`;
}

/**
 * decisionPanelClassName returns the main decision panel style.
 */
function decisionPanelClassName(shouldRun: boolean): string {
	const baseClassName = 'cf:rounded-3xl cf:border cf:p-5';

	if (shouldRun) {
		return `${baseClassName} cf:border-emerald-300/20 cf:bg-emerald-400/10`;
	}

	return `${baseClassName} cf:border-amber-300/20 cf:bg-amber-300/10`;
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
	const date = new Date();
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

	return 'Could not evaluate standup runtime.';
}
