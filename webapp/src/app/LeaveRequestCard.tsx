import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';

import {
	ApiClientError,
	createLeaveRequest,
	listApprovedLeaveRequests,
	listLeaveTypes,
	listMyActiveLeaveRequests,
	validateLeaveRequest,
} from '../api/client';
import type {
	ApprovedLeaveRequest,
	LeaveDurationMode,
	LeaveHalfDayPart,
	LeaveRequest,
	LeaveType,
	PendingLeaveRequest,
	Workspace,
} from '../types/domain';
import { WorkspaceMemberSelect } from './WorkspaceMemberSelect';

/**
 * LeaveRequestCardProps contains the workspace used for leave requests.
 */
type LeaveRequestCardProps = {
	readonly workspace: Workspace;
	readonly onLeaveCreated: () => void;
};

/**
 * LeaveFormState contains the controlled leave request form values.
 */
type LeaveFormState = {
	readonly leaveTypeID: string;
	readonly startDate: string;
	readonly endDate: string;
	readonly durationMode: LeaveDurationMode;
	readonly halfDayPart: LeaveHalfDayPart | '';
	readonly startTime: string;
	readonly endTime: string;
	readonly reason: string;
	readonly backupUserID: string;
};

/**
 * LeaveConflictWarning describes a warning shown before leave submission.
 */
type LeaveConflictWarning = {
	readonly kind: 'validation' | 'own_overlap' | 'backup_unavailable' | 'many_people_out' | 'existing_same_day';
	readonly message: string;
};

/**
 * LoadState describes the leave panel loading status.
 */
type LoadState = 'idle' | 'loading' | 'ready' | 'validating' | 'saving' | 'error';

/**
 * LeaveRequestCard renders leave request creation with pre-submit conflict warnings.
 */
export function LeaveRequestCard(props: LeaveRequestCardProps): ReactElement {
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [leaveTypes, setLeaveTypes] = useState<readonly LeaveType[]>([]);
	const [createdLeaveRequest, setCreatedLeaveRequest] = useState<LeaveRequest | null>(null);
	const [myActiveLeaves, setMyActiveLeaves] = useState<readonly PendingLeaveRequest[]>([]);
	const [approvedLeaves, setApprovedLeaves] = useState<readonly ApprovedLeaveRequest[]>([]);
	const [warnings, setWarnings] = useState<readonly LeaveConflictWarning[]>([]);
	const [message, setMessage] = useState('');
	const [form, setForm] = useState<LeaveFormState>({
		leaveTypeID: '',
		startDate: '',
		endDate: '',
		durationMode: 'full_day',
		halfDayPart: '',
		startTime: '',
		endTime: '',
		reason: '',
		backupUserID: '',
	});

	useEffect(() => {
		let isActive = true;

		/**
		 * Loads leave types and current-user active leaves.
		 */
		async function loadInitialData(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const [typesResponse, activeLeavesResponse] = await Promise.all([
					listLeaveTypes(props.workspace.id),
					listMyActiveLeaveRequests(props.workspace.id),
				]);

				if (!isActive) {
					return;
				}

				setLeaveTypes(typesResponse.leaveTypes);
				setMyActiveLeaves(activeLeavesResponse.leaveRequests);
				setForm(current => ({
					...current,
					leaveTypeID: current.leaveTypeID || typesResponse.leaveTypes[0]?.id || '',
				}));
				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setMessage(errorToMessage(error));
				setLoadState('error');
			}
		}

		void loadInitialData();

		return () => {
			isActive = false;
		};
	}, [props.workspace.id]);

	useEffect(() => {
		let isActive = true;

		/**
		 * Loads approved leaves for the selected range so local warnings can be shown.
		 */
		async function loadApprovedLeavesForRange(): Promise<void> {
			if (!hasUsableDateRange(form)) {
				setApprovedLeaves([]);
				return;
			}

			try {
				const response = await listApprovedLeaveRequests(props.workspace.id, form.startDate, form.endDate);

				if (!isActive) {
					return;
				}

				setApprovedLeaves(response.leaveRequests);
			} catch (_error: unknown) {
				if (!isActive) {
					return;
				}

				setApprovedLeaves([]);
			}
		}

		void loadApprovedLeavesForRange();

		return () => {
			isActive = false;
		};
	}, [props.workspace.id, form.startDate, form.endDate]);

	const selectedLeaveType = useMemo(
		() => leaveTypes.find(leaveType => leaveType.id === form.leaveTypeID) ?? null,
		[leaveTypes, form.leaveTypeID],
	);

	const localWarnings = useMemo(
		() => buildLocalWarnings(form, myActiveLeaves, approvedLeaves),
		[approvedLeaves, form, myActiveLeaves],
	);

	const allWarnings = useMemo(() => mergeWarnings(localWarnings, warnings), [localWarnings, warnings]);

	const isBusy = loadState === 'loading' || loadState === 'validating' || loadState === 'saving';

	/**
	 * Updates one field on the leave form.
	 */
	function updateForm(patch: Partial<LeaveFormState>): void {
		setWarnings([]);
		setCreatedLeaveRequest(null);
		setForm(current => ({
			...current,
			...patch,
		}));
	}

	/**
	 * Validates the leave form and shows hard validation warnings.
	 */
	async function handleValidate(): Promise<boolean> {
		const localValidationMessage = validateFormLocally(form);
		if (localValidationMessage !== null) {
			setWarnings([{ kind: 'validation', message: localValidationMessage }]);
			setMessage(localValidationMessage);
			return false;
		}

		setLoadState('validating');
		setMessage('');

		try {
			await validateLeaveRequest({
				workspaceId: props.workspace.id,
				startDate: form.startDate,
				endDate: form.endDate,
				durationMode: form.durationMode,
				halfDayPart: form.halfDayPart,
				startTime: form.startTime,
				endTime: form.endTime,
			});

			setWarnings([]);
			setLoadState('ready');
			setMessage('Leave request dates passed hard validation.');
			return true;
		} catch (error: unknown) {
			const warning = errorToMessage(error);
			setWarnings([{ kind: 'validation', message: warning }]);
			setMessage(warning);
			setLoadState('ready');
			return false;
		}
	}

	/**
	 * Submits a leave request after validation.
	 */
	async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();

		const isValid = await handleValidate();
		if (!isValid) {
			return;
		}

		setLoadState('saving');
		setMessage('');

		try {
			const response = await createLeaveRequest({
				workspaceId: props.workspace.id,
				leaveTypeId: form.leaveTypeID,
				startDate: form.startDate,
				endDate: form.endDate,
				durationMode: form.durationMode,
				halfDayPart: form.durationMode === 'half_day' ? form.halfDayPart : '',
				startTime: form.durationMode === 'hourly' ? form.startTime : '',
				endTime: form.durationMode === 'hourly' ? form.endTime : '',
				reason: form.reason.trim(),
				backupUserId: form.backupUserID.trim(),
			});

			setCreatedLeaveRequest(response.leaveRequest);
			setMyActiveLeaves(current => [
				{
					leaveRequest: response.leaveRequest,
					leaveTypeName: selectedLeaveType?.name ?? 'Leave',
					leaveTypeColor: selectedLeaveType?.color ?? '',
				},
				...current,
			]);
			setForm(current => ({
				...current,
				startDate: '',
				endDate: '',
				halfDayPart: '',
				startTime: '',
				endTime: '',
				reason: '',
				backupUserID: '',
			}));
			setWarnings([]);
			setLoadState('ready');
			setMessage('Leave request created and sent for approval.');
			props.onLeaveCreated();
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	return (
		<section className="cf:mt-5 cf:rounded-3xl cf:border cf:border-emerald-300/20 cf:bg-white/[0.055] cf:p-6 cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
			<div className="cf:grid cf:gap-5 cf:lg:grid-cols-[1fr_auto] cf:lg:items-start">
				<div>
					<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-emerald-200">
						Leaves
					</p>
					<h2 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
						Request leave
					</h2>
					<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">
						Create a full-day, half-day, or hourly leave request. Campfire checks global off-days and shows
						conflict warnings before submission.
					</p>
				</div>

				<div className="cf:w-fit cf:rounded-full cf:border cf:border-emerald-300/25 cf:bg-emerald-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-emerald-100">
					{leaveTypes.length} types
				</div>
			</div>

			{message !== '' && <p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{message}</p>}

			<LeaveConflictWarnings warnings={allWarnings} />

			<form className="cf:mt-5 cf:grid cf:gap-4" onSubmit={event => void handleSubmit(event)}>
				<div className="cf:grid cf:gap-4 cf:lg:grid-cols-2">
					<label className="cf:grid cf:gap-2">
						<span className="cf:text-sm cf:font-black cf:text-slate-200">Leave type</span>
						<select
							className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:focus:border-emerald-300/45"
							disabled={isBusy || leaveTypes.length === 0}
							value={form.leaveTypeID}
							onChange={event => updateForm({ leaveTypeID: event.currentTarget.value })}
						>
							{leaveTypes.map(leaveType => (
								<option key={leaveType.id} value={leaveType.id}>
									{leaveType.name}
								</option>
							))}
						</select>
					</label>

					<label className="cf:grid cf:gap-2">
						<span className="cf:text-sm cf:font-black cf:text-slate-200">Duration mode</span>
						<select
							className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:focus:border-emerald-300/45"
							disabled={isBusy}
							value={form.durationMode}
							onChange={event =>
								updateForm({
									durationMode: event.currentTarget.value as LeaveDurationMode,
									halfDayPart: '',
									startTime: '',
									endTime: '',
								})
							}
						>
							<option value="full_day">Full day</option>
							<option value="half_day">Half day</option>
							<option value="hourly">Hourly</option>
						</select>
					</label>
				</div>

				<div className="cf:grid cf:gap-4 cf:lg:grid-cols-2">
					<label className="cf:grid cf:gap-2">
						<span className="cf:text-sm cf:font-black cf:text-slate-200">Start date</span>
						<input
							className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:focus:border-emerald-300/45"
							disabled={isBusy}
							type="date"
							value={form.startDate}
							onChange={event =>
								updateForm({
									startDate: event.currentTarget.value,
									endDate: form.endDate === '' ? event.currentTarget.value : form.endDate,
								})
							}
						/>
					</label>

					<label className="cf:grid cf:gap-2">
						<span className="cf:text-sm cf:font-black cf:text-slate-200">End date</span>
						<input
							className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:focus:border-emerald-300/45"
							disabled={isBusy}
							type="date"
							value={form.endDate}
							onChange={event => updateForm({ endDate: event.currentTarget.value })}
						/>
					</label>
				</div>

				{form.durationMode === 'half_day' && (
					<label className="cf:grid cf:gap-2">
						<span className="cf:text-sm cf:font-black cf:text-slate-200">Half day part</span>
						<select
							className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:focus:border-emerald-300/45"
							disabled={isBusy}
							value={form.halfDayPart}
							onChange={event =>
								updateForm({ halfDayPart: event.currentTarget.value as LeaveHalfDayPart })
							}
						>
							<option value="">Choose half</option>
							<option value="morning">Morning</option>
							<option value="afternoon">Afternoon</option>
						</select>
					</label>
				)}

				{form.durationMode === 'hourly' && (
					<div className="cf:grid cf:gap-4 cf:lg:grid-cols-2">
						<label className="cf:grid cf:gap-2">
							<span className="cf:text-sm cf:font-black cf:text-slate-200">Start time</span>
							<input
								className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:focus:border-emerald-300/45"
								disabled={isBusy}
								type="time"
								value={form.startTime}
								onChange={event => updateForm({ startTime: event.currentTarget.value })}
							/>
						</label>

						<label className="cf:grid cf:gap-2">
							<span className="cf:text-sm cf:font-black cf:text-slate-200">End time</span>
							<input
								className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:focus:border-emerald-300/45"
								disabled={isBusy}
								type="time"
								value={form.endTime}
								onChange={event => updateForm({ endTime: event.currentTarget.value })}
							/>
						</label>
					</div>
				)}

				<label className="cf:grid cf:gap-2">
					<span className="cf:text-sm cf:font-black cf:text-slate-200">Reason</span>
					<textarea
						className="cf:min-h-24 cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:placeholder:text-slate-500 cf:focus:border-emerald-300/45"
						disabled={isBusy}
						placeholder="Short reason for approvers"
						value={form.reason}
						onChange={event => updateForm({ reason: event.currentTarget.value })}
					/>
				</label>

				<WorkspaceMemberSelect
					disabled={isBusy}
					label="Backup user"
					placeholder="Search workspace members"
					value={form.backupUserID}
					workspaceID={props.workspace.id}
					onChange={backupUserID => updateForm({ backupUserID })}
				/>

				<div className="cf:flex cf:flex-wrap cf:gap-3">
					<button
						className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.06] cf:px-5 cf:py-3 cf:font-black cf:text-white cf:transition cf:hover:bg-white/[0.1] cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
						disabled={isBusy}
						type="button"
						onClick={() => void handleValidate()}
					>
						Check conflicts
					</button>

					<button
						className="cf:rounded-2xl cf:border cf:border-emerald-300/30 cf:bg-emerald-400/20 cf:px-5 cf:py-3 cf:font-black cf:text-emerald-50 cf:transition cf:hover:bg-emerald-400/30 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
						disabled={isBusy || leaveTypes.length === 0}
						type="submit"
					>
						Request leave
					</button>
				</div>
			</form>

			{createdLeaveRequest !== null && (
				<div className="cf:mt-5 cf:rounded-2xl cf:border cf:border-emerald-300/20 cf:bg-emerald-300/10 cf:p-4">
					<strong className="cf:block cf:text-emerald-100">Request created</strong>
					<p className="cf:m-0 cf:mt-1 cf:text-sm cf:leading-6 cf:text-emerald-50/90">
						{createdLeaveRequest.startDate} → {createdLeaveRequest.endDate} · {createdLeaveRequest.status}
					</p>
				</div>
			)}
		</section>
	);
}

/**
 * LeaveConflictWarnings renders pre-submit warning messages.
 */
function LeaveConflictWarnings(props: { readonly warnings: readonly LeaveConflictWarning[] }): ReactElement | null {
	if (props.warnings.length === 0) {
		return null;
	}

	return (
		<div className="cf:mt-5 cf:rounded-3xl cf:border cf:border-amber-300/25 cf:bg-amber-300/10 cf:p-4">
			<strong className="cf:block cf:text-sm cf:font-black cf:uppercase cf:tracking-[0.14em] cf:text-amber-200">
				Conflict warnings
			</strong>
			<ul className="cf:m-0 cf:mt-3 cf:grid cf:gap-2 cf:pl-5 cf:text-sm cf:leading-6 cf:text-amber-50">
				{props.warnings.map(warning => (
					<li key={`${warning.kind}:${warning.message}`}>{warning.message}</li>
				))}
			</ul>
		</div>
	);
}

/**
 * buildLocalWarnings returns non-blocking warnings from already-loaded leave data.
 */
function buildLocalWarnings(
	form: LeaveFormState,
	myActiveLeaves: readonly PendingLeaveRequest[],
	approvedLeaves: readonly ApprovedLeaveRequest[],
): readonly LeaveConflictWarning[] {
	if (!hasUsableDateRange(form)) {
		return [];
	}

	const warnings: LeaveConflictWarning[] = [];

	const overlappingOwnLeaves = myActiveLeaves.filter(row =>
		overlapsDateRange(row.leaveRequest.startDate, row.leaveRequest.endDate, form.startDate, form.endDate),
	);

	if (overlappingOwnLeaves.length > 0) {
		warnings.push({
			kind: 'own_overlap',
			message: `You already have ${overlappingOwnLeaves.length} active leave request(s) overlapping this date range.`,
		});
	}

	const existingSameDayLeaves = approvedLeaves.filter(row =>
		overlapsDateRange(row.leaveRequest.startDate, row.leaveRequest.endDate, form.startDate, form.endDate),
	);

	if (existingSameDayLeaves.length > 0) {
		warnings.push({
			kind: 'existing_same_day',
			message: `${existingSameDayLeaves.length} approved leave request(s) already overlap this date range.`,
		});
	}

	if (existingSameDayLeaves.length >= 3) {
		warnings.push({
			kind: 'many_people_out',
			message: 'Three or more approved leaves overlap this range. Coverage may be tight.',
		});
	}

	const cleanBackupUserID = form.backupUserID.trim();
	if (cleanBackupUserID !== '') {
		const backupIsUnavailable = existingSameDayLeaves.some(row => row.leaveRequest.userId === cleanBackupUserID);
		if (backupIsUnavailable) {
			warnings.push({
				kind: 'backup_unavailable',
				message: 'The selected backup user already has approved leave in this date range.',
			});
		}
	}

	return warnings;
}

/**
 * mergeWarnings de-duplicates warning messages while preserving order.
 */
function mergeWarnings(
	firstWarnings: readonly LeaveConflictWarning[],
	secondWarnings: readonly LeaveConflictWarning[],
): readonly LeaveConflictWarning[] {
	const seen = new Set<string>();
	const merged: LeaveConflictWarning[] = [];

	for (const warning of [...firstWarnings, ...secondWarnings]) {
		const key = `${warning.kind}:${warning.message}`;
		if (seen.has(key)) {
			continue;
		}

		seen.add(key);
		merged.push(warning);
	}

	return merged;
}

/**
 * validateFormLocally returns a local validation error, if any.
 */
function validateFormLocally(form: LeaveFormState): string | null {
	if (form.leaveTypeID.trim() === '') {
		return 'Choose a leave type.';
	}

	if (form.startDate.trim() === '') {
		return 'Choose a start date.';
	}

	if (form.endDate.trim() === '') {
		return 'Choose an end date.';
	}

	if (form.endDate < form.startDate) {
		return 'End date must be on or after start date.';
	}

	if (form.durationMode === 'half_day' && form.halfDayPart === '') {
		return 'Choose morning or afternoon for half-day leave.';
	}

	if (form.durationMode === 'hourly') {
		if (form.startTime.trim() === '' || form.endTime.trim() === '') {
			return 'Choose start and end time for hourly leave.';
		}

		if (form.startTime >= form.endTime) {
			return 'Hourly leave end time must be after start time.';
		}
	}

	return null;
}

/**
 * hasUsableDateRange returns true when date range fields are ready for conflict checks.
 */
function hasUsableDateRange(form: LeaveFormState): boolean {
	return form.startDate.trim() !== '' && form.endDate.trim() !== '' && form.endDate >= form.startDate;
}

/**
 * overlapsDateRange returns true when two inclusive local-date ranges overlap.
 */
function overlapsDateRange(startDate: string, endDate: string, rangeStart: string, rangeEnd: string): boolean {
	return startDate <= rangeEnd && endDate >= rangeStart;
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

	return 'Could not create leave request.';
}
