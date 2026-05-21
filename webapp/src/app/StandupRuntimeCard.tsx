import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, CalendarX2, Loader2, Search, Umbrella } from 'lucide-react';

import { ApiClientError, evaluateStandupDay } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ApprovedLeaveRequest, StandupRunDecision, Workspace } from '@/types/domain';

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

		/**
		 * Loads the backend runtime decision for one date.
		 */
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

	const userIDsForProfiles = useMemo(() => collectRuntimeUserIDs(decision), [decision]);
	const {
		errorMessage: profileErrorMessage,
		labelForUserID,
		loading: profilesLoading,
	} = useUserProfiles(userIDsForProfiles);

	return (
		<CampfirePanel className="cf:overflow-hidden">
			<CampfireCardHeader
				eyebrow="Runtime"
				title="Standup run decision"
				description="Campfire checks working days, global off-days, workspace off-days, approved leave, and whether everyone is away."
				icon={decision?.shouldRun === false ? CalendarX2 : CalendarCheck2}
				action={
					decision !== null && (
						<CampfireStatusPill tone={decision.shouldRun ? 'green' : 'red'}>
							{decision.shouldRun ? 'Will run' : 'Will skip'}
						</CampfireStatusPill>
					)
				}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
				<div className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4 cf:lg:grid-cols-[1fr_auto] cf:lg:items-end">
					<FormField label="Date" htmlFor="campfire-runtime-date">
						<Input
							id="campfire-runtime-date"
							type="date"
							value={date}
							onChange={event => setDate(event.currentTarget.value)}
						/>
					</FormField>

					<Button type="button" variant="secondary" onClick={() => setDate(getTodayLocalDateString())}>
						<Search className="cf:size-4" />
						Today
					</Button>
				</div>

				{message !== '' && <MessageRow state={loadState} message={message} />}
				{profileErrorMessage !== '' && <MessageRow state="error" message={profileErrorMessage} />}
				{profilesLoading && <LoadingRow label="Resolving leave users…" />}
				{loadState === 'loading' && <LoadingRow label="Evaluating standup runtime…" />}

				{decision !== null && (
					<>
						<div className="cf:grid cf:gap-3 cf:md:grid-cols-4">
							<CampfireMetric
								label="Decision"
								value={decision.shouldRun ? 'Run' : 'Skip'}
								helper={formatReason(decision.reason)}
							/>
							<CampfireMetric label="Working day" value={decision.isWorkingDay ? 'Yes' : 'No'} />
							<CampfireMetric label="Members" value={String(decision.memberCount)} />
							<CampfireMetric label="On leave" value={String(decision.onLeaveMemberCount)} />
						</div>

						<div className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-4">
							<p className="cf:text-sm cf:font-black cf:text-white">Runtime message</p>
							<p className="cf:mt-2 cf:text-sm cf:font-medium cf:leading-7 cf:text-slate-300">
								{decision.message ||
									(decision.shouldRun ? 'Standup should run.' : 'Standup should be skipped.')}
							</p>
						</div>

						<div className="cf:grid cf:gap-5 cf:xl:grid-cols-3">
							<RuntimeList
								title="Global off-days"
								emptyTitle="No global off-day"
								rows={decision.globalOffDays.map(row => ({
									id: row.id,
									title: row.label,
									description: row.date,
								}))}
							/>

							<RuntimeList
								title="Workspace off-days"
								emptyTitle="No workspace off-day"
								rows={decision.workspaceOffDays.map(row => ({
									id: row.id,
									title: row.label,
									description: row.date,
								}))}
							/>

							<ApprovedLeaveList rows={decision.approvedLeaves} labelForUserID={labelForUserID} />
						</div>
					</>
				)}

				{decision === null && loadState !== 'loading' && (
					<CampfireEmpty
						icon={CalendarCheck2}
						title="No runtime decision loaded"
						description="Choose a date to see whether Campfire should run standups."
					/>
				)}
			</CampfireCardBody>
		</CampfirePanel>
	);
}

/**
 * RuntimeListRow describes a generic runtime row.
 */
type RuntimeListRow = {
	readonly id: string;
	readonly title: string;
	readonly description: string;
};

/**
 * RuntimeList renders a generic runtime evidence list.
 */
function RuntimeList(props: {
	readonly title: string;
	readonly emptyTitle: string;
	readonly rows: readonly RuntimeListRow[];
}): ReactElement {
	return (
		<div className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:flex cf:items-center cf:justify-between cf:gap-3">
				<h3 className="cf:text-lg cf:font-black cf:text-white">{props.title}</h3>
				<CampfireStatusPill tone="slate">{props.rows.length}</CampfireStatusPill>
			</div>

			<div className="cf:mt-4 cf:grid cf:gap-3">
				{props.rows.length === 0 && (
					<CampfireEmpty
						icon={CalendarCheck2}
						title={props.emptyTitle}
						description="No matching rows for this date."
					/>
				)}

				{props.rows.map(row => (
					<div className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-3" key={row.id}>
						<strong className="cf:block cf:text-sm cf:font-black cf:text-white">{row.title}</strong>
						<span className="cf:mt-1 cf:block cf:text-sm cf:font-medium cf:text-slate-400">
							{row.description}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * ApprovedLeaveList renders runtime approved leave evidence.
 */
function ApprovedLeaveList(props: {
	readonly rows: readonly ApprovedLeaveRequest[];
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	return (
		<div className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:flex cf:items-center cf:justify-between cf:gap-3">
				<h3 className="cf:text-lg cf:font-black cf:text-white">Approved leave</h3>
				<CampfireStatusPill tone="green">{props.rows.length}</CampfireStatusPill>
			</div>

			<div className="cf:mt-4 cf:grid cf:gap-3">
				{props.rows.length === 0 && (
					<CampfireEmpty
						icon={Umbrella}
						title="No approved leave"
						description="No approved leave rows affect this date."
					/>
				)}

				{props.rows.map(row => (
					<div
						className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-3"
						key={row.leaveRequest.id}
					>
						<strong
							className="cf:block cf:text-sm cf:font-black cf:text-white"
							title={row.leaveRequest.userId}
						>
							{props.labelForUserID(row.leaveRequest.userId)}
						</strong>
						<span className="cf:mt-1 cf:block cf:text-sm cf:font-medium cf:text-slate-400">
							{row.leaveTypeName} · {row.leaveRequest.startDate} → {row.leaveRequest.endDate}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * FormField renders a labeled field.
 */
function FormField(props: {
	readonly label: string;
	readonly htmlFor: string;
	readonly children: ReactElement;
}): ReactElement {
	return (
		<div className="cf:grid cf:gap-2">
			<Label
				htmlFor={props.htmlFor}
				className="cf:text-xs cf:font-black cf:uppercase cf:tracking-widest cf:text-amber-200"
			>
				{props.label}
			</Label>
			{props.children}
		</div>
	);
}

/**
 * MessageRow renders a status or error row.
 */
function MessageRow(props: { readonly state: LoadState; readonly message: string }): ReactElement {
	const isError = props.state === 'error';

	return (
		<div
			className={
				isError
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
 * collectRuntimeUserIDs returns all user IDs referenced by a runtime decision.
 */
function collectRuntimeUserIDs(decision: StandupRunDecision | null): readonly string[] {
	if (decision === null) {
		return [];
	}

	const userIDs: string[] = [];

	for (const row of decision.approvedLeaves) {
		userIDs.push(row.leaveRequest.userId);

		if (row.leaveRequest.backupUserId !== '') {
			userIDs.push(row.leaveRequest.backupUserId);
		}
	}

	return userIDs;
}

/**
 * formatReason converts skip reasons to readable labels.
 */
function formatReason(value: string): string {
	if (value.trim() === '') {
		return 'No skip reason';
	}

	return value
		.split('_')
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

/**
 * getTodayLocalDateString returns today's local YYYY-MM-DD date.
 */
function getTodayLocalDateString(): string {
	const today = new Date();
	const year = String(today.getFullYear());
	const month = String(today.getMonth() + 1).padStart(2, '0');
	const day = String(today.getDate()).padStart(2, '0');

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
