import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { CalendarDays, Loader2, Search, Umbrella } from 'lucide-react';

import { ApiClientError, listApprovedLeaveRequests } from '@/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
 * ApprovedLeavesCardProps contains workspace and refresh data.
 */
type ApprovedLeavesCardProps = {
	readonly workspace: Workspace;
	readonly refreshToken: number;
};

/**
 * LoadState describes approved leave card loading status.
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

		/**
		 * Loads approved leave rows for the selected date window.
		 */
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

	const userIDsForProfiles = useMemo(() => collectLeaveUserIDs(leaveRequests), [leaveRequests]);
	const {
		errorMessage: profileErrorMessage,
		labelForUserID,
		loading: profilesLoading,
	} = useUserProfiles(userIDsForProfiles);

	const leaveTypeCounts = useMemo(() => countByLeaveType(leaveRequests), [leaveRequests]);
	const uniqueUserCount = useMemo(
		() => new Set(leaveRequests.map(row => row.leaveRequest.userId)).size,
		[leaveRequests],
	);

	return (
		<CampfirePanel className="cf:overflow-hidden">
			<CampfireCardHeader
				eyebrow="Calendar"
				title="Approved leave calendar"
				description="Approved leave in this date window. This data feeds standup scheduling, daily availability, and reports."
				icon={CalendarDays}
				action={<CampfireStatusPill tone="green">{leaveRequests.length} approved</CampfireStatusPill>}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
				<div className="cf:grid cf:gap-3 cf:md:grid-cols-3">
					<CampfireMetric
						label="Approved rows"
						value={String(leaveRequests.length)}
						helper="In selected range"
					/>
					<CampfireMetric label="People out" value={String(uniqueUserCount)} helper="Unique users" />
					<CampfireMetric
						label="Leave types"
						value={String(leaveTypeCounts.length)}
						helper="Represented types"
					/>
				</div>

				<form className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4 cf:lg:grid-cols-[1fr_1fr_auto] cf:lg:items-end">
					<FormField label="Start date" htmlFor="campfire-approved-leaves-start">
						<Input
							id="campfire-approved-leaves-start"
							type="date"
							value={startDate}
							onChange={event => setStartDate(event.currentTarget.value)}
						/>
					</FormField>

					<FormField label="End date" htmlFor="campfire-approved-leaves-end">
						<Input
							id="campfire-approved-leaves-end"
							type="date"
							value={endDate}
							onChange={event => setEndDate(event.currentTarget.value)}
						/>
					</FormField>

					<Button
						type="button"
						variant="secondary"
						onClick={() => setEndDate(addDaysToLocalDate(startDate, 30))}
					>
						<Search className="cf:size-4" />
						30 days
					</Button>
				</form>

				{message !== '' && <MessageRow state={loadState} message={message} />}
				{profileErrorMessage !== '' && <MessageRow state="error" message={profileErrorMessage} />}
				{profilesLoading && <LoadingRow label="Resolving user names…" />}
				{loadState === 'loading' && <LoadingRow label="Loading approved leaves…" />}

				{leaveTypeCounts.length > 0 && (
					<div className="cf:flex cf:flex-wrap cf:gap-2">
						{leaveTypeCounts.map(row => (
							<Badge className="cf:rounded-full" variant="secondary" key={row.leaveTypeName}>
								{row.leaveTypeName}: {row.count}
							</Badge>
						))}
					</div>
				)}

				<Separator className="cf:bg-white/10" />

				{loadState !== 'loading' && leaveRequests.length === 0 && (
					<CampfireEmpty
						icon={Umbrella}
						title="No approved leave in this window"
						description="Try a different date range or approve pending requests first."
					/>
				)}

				<div className="cf:grid cf:gap-3">
					{leaveRequests.map(row => (
						<ApprovedLeaveRow row={row} labelForUserID={labelForUserID} key={row.leaveRequest.id} />
					))}
				</div>
			</CampfireCardBody>
		</CampfirePanel>
	);
}

/**
 * ApprovedLeaveRow renders one approved leave row.
 */
function ApprovedLeaveRow(props: {
	readonly row: ApprovedLeaveRequest;
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	return (
		<article className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:flex cf:flex-col cf:gap-3 cf:sm:flex-row cf:sm:items-start cf:sm:justify-between">
				<div>
					<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
						<strong
							className="cf:text-lg cf:font-black cf:text-white"
							title={props.row.leaveRequest.userId}
						>
							{props.labelForUserID(props.row.leaveRequest.userId)}
						</strong>
						<CampfireStatusPill tone="green">Approved</CampfireStatusPill>
					</div>

					<p className="cf:mt-3 cf:text-sm cf:font-bold cf:text-slate-300">
						{props.row.leaveRequest.startDate} → {props.row.leaveRequest.endDate}
						{formatDurationDetails(props.row)}
					</p>

					<div className="cf:mt-3 cf:flex cf:flex-wrap cf:gap-2">
						<MetaChip label="Type" value={props.row.leaveTypeName} />
						<MetaChip
							label="Backup"
							value={backupLabel(props.row.leaveRequest.backupUserId, props.labelForUserID)}
						/>
					</div>
				</div>

				<div className="cf:rounded-2xl cf:border cf:border-emerald-300/20 cf:bg-emerald-300/10 cf:px-4 cf:py-3 cf:text-right">
					<p className="cf:text-xs cf:font-black cf:uppercase cf:tracking-widest cf:text-emerald-100">
						Leave type
					</p>
					<p className="cf:mt-1 cf:text-sm cf:font-black cf:text-white">{props.row.leaveTypeName}</p>
				</div>
			</div>

			{props.row.leaveRequest.reason !== '' && (
				<p className="cf:mt-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-3 cf:text-sm cf:font-medium cf:leading-6 cf:text-slate-200">
					{props.row.leaveRequest.reason}
				</p>
			)}
		</article>
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
 * MetaChip renders optional row metadata.
 */
function MetaChip(props: { readonly label: string; readonly value: string }): ReactElement | null {
	if (props.value.trim() === '') {
		return null;
	}

	return (
		<span className="cf:rounded-full cf:border cf:border-white/10 cf:bg-white/5 cf:px-2.5 cf:py-1 cf:text-xs cf:font-bold cf:text-slate-300">
			{props.label}: {props.value}
		</span>
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
 * countByLeaveType groups approved leaves by type.
 */
function countByLeaveType(
	rows: readonly ApprovedLeaveRequest[],
): readonly { readonly leaveTypeName: string; readonly count: number }[] {
	const counts: Record<string, number> = {};

	for (const row of rows) {
		counts[row.leaveTypeName] = (counts[row.leaveTypeName] ?? 0) + 1;
	}

	return Object.entries(counts)
		.map(([leaveTypeName, count]) => ({ leaveTypeName, count }))
		.sort((first, second) => second.count - first.count || first.leaveTypeName.localeCompare(second.leaveTypeName));
}

/**
 * collectLeaveUserIDs returns user IDs referenced by approved leave rows.
 */
function collectLeaveUserIDs(rows: readonly ApprovedLeaveRequest[]): readonly string[] {
	const userIDs: string[] = [];

	for (const row of rows) {
		userIDs.push(row.leaveRequest.userId);

		if (row.leaveRequest.backupUserId.trim() !== '') {
			userIDs.push(row.leaveRequest.backupUserId);
		}
	}

	return userIDs;
}

/**
 * backupLabel returns a readable backup label.
 */
function backupLabel(backupUserID: string, labelForUserID: (userID: string) => string): string {
	if (backupUserID.trim() === '') {
		return '';
	}

	return labelForUserID(backupUserID);
}

/**
 * formatDurationDetails returns compact duration-specific display text.
 */
function formatDurationDetails(item: ApprovedLeaveRequest): string {
	const request = item.leaveRequest;

	switch (request.durationMode) {
		case 'half_day':
			return request.halfDayPart === '' ? ' · half day' : ` · half day · ${formatLabel(request.halfDayPart)}`;

		case 'hourly':
			return ` · ${request.startTime} → ${request.endTime}`;

		case 'full_day':
			return '';

		default:
			return '';
	}
}

/**
 * formatLabel converts enum-like strings to readable labels.
 */
function formatLabel(value: string): string {
	return value
		.split('_')
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
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

	return 'Could not load approved leaves.';
}
