import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, FormEvent, ReactElement, SetStateAction } from 'react';
import { AlertTriangle, CalendarPlus, CheckCircle2, Loader2, ShieldCheck, Umbrella } from 'lucide-react';
import { toast } from 'sonner';

import {
	ApiClientError,
	createLeaveRequest,
	listApprovedLeaveRequests,
	listLeaveTypes,
	listMyActiveLeaveRequests,
	validateLeaveRequest,
} from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type {
	ApprovedLeaveRequest,
	LeaveDurationMode,
	LeaveHalfDayPart,
	LeaveRequest,
	LeaveType,
	PendingLeaveRequest,
	Workspace,
} from '@/types/domain';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireEmpty,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from './campfire-ui';

/**
 * LeaveRequestCardProps contains workspace data and post-create callback.
 */
type LeaveRequestCardProps = {
	readonly workspace: Workspace;
	readonly onLeaveCreated: () => void;
};

/**
 * LeaveFormState contains controlled leave request form values.
 */
type LeaveFormState = {
	readonly leaveTypeID: string;
	readonly startDate: string;
	readonly endDate: string;
	readonly durationMode: LeaveDurationMode;
	readonly halfDayPart: '' | LeaveHalfDayPart;
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

const emptyLeaveForm: LeaveFormState = {
	leaveTypeID: '',
	startDate: '',
	endDate: '',
	durationMode: 'full_day',
	halfDayPart: '',
	startTime: '',
	endTime: '',
	reason: '',
	backupUserID: '',
};

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
	const [form, setForm] = useState<LeaveFormState>(emptyLeaveForm);

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

	const selectedLeaveType = useMemo(() => {
		return leaveTypes.find(leaveType => leaveType.id === form.leaveTypeID) ?? null;
	}, [leaveTypes, form.leaveTypeID]);

	const isBusy = loadState === 'loading' || loadState === 'validating' || loadState === 'saving';

	/**
	 * Validates and creates a leave request.
	 */
	async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();

		const localValidationMessage = validateForm(form);
		if (localValidationMessage !== null) {
			setMessage(localValidationMessage);
			setLoadState('error');
			return;
		}

		setLoadState('validating');
		setMessage('');

		try {
			const validationResponse = await validateLeaveRequest({
				workspaceId: props.workspace.id,
				leaveTypeId: form.leaveTypeID,
				startDate: form.startDate,
				endDate: form.endDate,
				durationMode: form.durationMode,
				halfDayPart: form.halfDayPart,
				startTime: form.startTime,
				endTime: form.endTime,
				backupUserId: form.backupUserID.trim(),
			});

			const nextWarnings = buildWarnings(form, myActiveLeaves, approvedLeaves, validationResponse.valid);

			if (nextWarnings.length > 0 && warnings.length === 0) {
				setWarnings(nextWarnings);
				setLoadState('ready');
				setMessage('Review the warnings, then submit again if this request is still correct.');
				return;
			}

			setLoadState('saving');

			const response = await createLeaveRequest({
				workspaceId: props.workspace.id,
				leaveTypeId: form.leaveTypeID,
				startDate: form.startDate,
				endDate: form.endDate,
				durationMode: form.durationMode,
				halfDayPart: form.halfDayPart,
				startTime: form.startTime,
				endTime: form.endTime,
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
			setWarnings([]);
			setMessage('Leave request created.');
			setForm(current => ({
				...emptyLeaveForm,
				leaveTypeID: current.leaveTypeID,
			}));
			setLoadState('ready');
			toast.success('Leave request created');
			props.onLeaveCreated();
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);
			setMessage(errorMessage);
			setLoadState('error');
			toast.error(errorMessage);
		}
	}

	/**
	 * Updates form and clears warnings for meaningful field changes.
	 */
	function patchForm(patch: Partial<LeaveFormState>): void {
		setWarnings([]);
		setMessage('');
		updateForm(setForm, patch);
	}

	return (
		<CampfirePanel className="cf:overflow-hidden">
			<CampfireCardHeader
				eyebrow="Leave request"
				title="Request leave"
				description="Ask for time away, choose coverage, and let Campfire keep standups and reports leave-aware."
				icon={CalendarPlus}
				action={
					<CampfireStatusPill tone="ember">
						<Umbrella className="cf:size-3.5" />
						{myActiveLeaves.length} active
					</CampfireStatusPill>
				}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
				<div className="cf:grid cf:gap-3 cf:md:grid-cols-3">
					<CampfireMetric
						label="Leave types"
						value={String(leaveTypes.length)}
						helper="Workspace configured"
					/>
					<CampfireMetric
						label="My active"
						value={String(myActiveLeaves.length)}
						helper="Pending or approved"
					/>
					<CampfireMetric
						label="Range checks"
						value={approvedLeaves.length === 0 ? 'Clear' : String(approvedLeaves.length)}
						helper="Approved rows in range"
					/>
				</div>

				{message !== '' && <MessageRow state={loadState} message={message} />}
				{warnings.length > 0 && <WarningList warnings={warnings} />}
				{createdLeaveRequest !== null && <CreatedLeaveBanner leaveRequest={createdLeaveRequest} />}

				{loadState === 'loading' && <LoadingRow label="Loading leave settings…" />}

				{loadState !== 'loading' && leaveTypes.length === 0 && (
					<CampfireEmpty
						icon={Umbrella}
						title="No leave types configured"
						description="This workspace has no active leave types yet. Ask a workspace lead to configure leave settings."
					/>
				)}

				{leaveTypes.length > 0 && (
					<form className="cf:grid cf:gap-5" onSubmit={handleSubmit}>
						<div className="cf:grid cf:gap-5 cf:xl:grid-cols-[0.92fr_1.08fr]">
							<section className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
								<h3 className="cf:text-lg cf:font-black cf:text-white">Leave details</h3>

								<div className="cf:mt-4 cf:grid cf:gap-4">
									<FormField label="Leave type" htmlFor="campfire-leave-type">
										<select
											id="campfire-leave-type"
											className={selectClassName()}
											disabled={isBusy}
											value={form.leaveTypeID}
											onChange={event => patchForm({ leaveTypeID: event.currentTarget.value })}
										>
											{leaveTypes.map(leaveType => (
												<option key={leaveType.id} value={leaveType.id}>
													{leaveType.name}
												</option>
											))}
										</select>
									</FormField>

									<div className="cf:grid cf:gap-4 cf:sm:grid-cols-2">
										<FormField label="Start date" htmlFor="campfire-leave-start-date">
											<Input
												id="campfire-leave-start-date"
												type="date"
												disabled={isBusy}
												value={form.startDate}
												onChange={event => patchForm({ startDate: event.currentTarget.value })}
											/>
										</FormField>

										<FormField label="End date" htmlFor="campfire-leave-end-date">
											<Input
												id="campfire-leave-end-date"
												type="date"
												disabled={isBusy}
												value={form.endDate}
												onChange={event => patchForm({ endDate: event.currentTarget.value })}
											/>
										</FormField>
									</div>

									<FormField label="Duration mode" htmlFor="campfire-leave-duration-mode">
										<select
											id="campfire-leave-duration-mode"
											className={selectClassName()}
											disabled={isBusy}
											value={form.durationMode}
											onChange={event =>
												patchForm(normalizeDurationMode(event.currentTarget.value))
											}
										>
											<option value="full_day">Full day</option>
											<option value="half_day">Half day</option>
											<option value="hourly">Hourly</option>
										</select>
									</FormField>

									{form.durationMode === 'half_day' && (
										<FormField label="Half day part" htmlFor="campfire-leave-half-day">
											<select
												id="campfire-leave-half-day"
												className={selectClassName()}
												disabled={isBusy}
												value={form.halfDayPart}
												onChange={event =>
													patchForm({
														halfDayPart:
															event.currentTarget.value === 'afternoon'
																? 'afternoon'
																: 'morning',
													})
												}
											>
												<option value="">Choose half</option>
												<option value="morning">Morning</option>
												<option value="afternoon">Afternoon</option>
											</select>
										</FormField>
									)}

									{form.durationMode === 'hourly' && (
										<div className="cf:grid cf:gap-4 cf:sm:grid-cols-2">
											<FormField label="Start time" htmlFor="campfire-leave-start-time">
												<Input
													id="campfire-leave-start-time"
													type="time"
													disabled={isBusy}
													value={form.startTime}
													onChange={event =>
														patchForm({ startTime: event.currentTarget.value })
													}
												/>
											</FormField>

											<FormField label="End time" htmlFor="campfire-leave-end-time">
												<Input
													id="campfire-leave-end-time"
													type="time"
													disabled={isBusy}
													value={form.endTime}
													onChange={event =>
														patchForm({ endTime: event.currentTarget.value })
													}
												/>
											</FormField>
										</div>
									)}
								</div>
							</section>

							<section className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
								<h3 className="cf:text-lg cf:font-black cf:text-white">Context and coverage</h3>

								<div className="cf:mt-4 cf:grid cf:gap-4">
									<FormField label="Backup user ID" htmlFor="campfire-leave-backup">
										<Input
											id="campfire-leave-backup"
											disabled={isBusy}
											placeholder="Optional Mattermost user ID"
											value={form.backupUserID}
											onChange={event => patchForm({ backupUserID: event.currentTarget.value })}
										/>
									</FormField>

									<FormField label="Reason" htmlFor="campfire-leave-reason">
										<Textarea
											id="campfire-leave-reason"
											className="cf:min-h-32"
											disabled={isBusy}
											placeholder="Optional note for approvers..."
											value={form.reason}
											onChange={event => patchForm({ reason: event.currentTarget.value })}
										/>
									</FormField>

									<div className="cf:rounded-3xl cf:border cf:border-amber-300/20 cf:bg-amber-950/20 cf:p-4">
										<div className="cf:flex cf:items-start cf:gap-3">
											<ShieldCheck className="cf:mt-0.5 cf:size-5 cf:text-amber-200" />
											<div>
												<p className="cf:text-sm cf:font-black cf:text-amber-100">
													Approver visibility
												</p>
												<p className="cf:mt-1 cf:text-sm cf:font-medium cf:leading-6 cf:text-slate-300">
													Approvers can review this request. Approved dates are excluded from
													missing standup reports.
												</p>
											</div>
										</div>
									</div>

									<Button type="submit" disabled={isBusy}>
										{loadState === 'validating' || loadState === 'saving' ? (
											<Loader2 className="cf:size-4 cf:animate-spin" />
										) : (
											<CalendarPlus className="cf:size-4" />
										)}
										{warnings.length > 0 ? 'Submit with warnings' : 'Request leave'}
									</Button>
								</div>
							</section>
						</div>
					</form>
				)}
			</CampfireCardBody>
		</CampfirePanel>
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
 * WarningList renders pre-submit leave warnings.
 */
function WarningList(props: { readonly warnings: readonly LeaveConflictWarning[] }): ReactElement {
	return (
		<div className="cf:grid cf:gap-3 cf:rounded-3xl cf:border cf:border-amber-300/25 cf:bg-amber-950/30 cf:p-4">
			<div className="cf:flex cf:items-center cf:gap-2">
				<AlertTriangle className="cf:size-5 cf:text-amber-200" />
				<strong className="cf:text-sm cf:font-black cf:text-amber-100">Review before submitting</strong>
			</div>

			<ul className="cf:m-0 cf:grid cf:list-none cf:gap-2 cf:p-0">
				{props.warnings.map(warning => (
					<li
						className="cf:text-sm cf:font-medium cf:leading-6 cf:text-amber-50"
						key={`${warning.kind}-${warning.message}`}
					>
						{warning.message}
					</li>
				))}
			</ul>
		</div>
	);
}

/**
 * CreatedLeaveBanner renders success details after creation.
 */
function CreatedLeaveBanner(props: { readonly leaveRequest: LeaveRequest }): ReactElement {
	return (
		<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-3 cf:rounded-3xl cf:border cf:border-emerald-300/25 cf:bg-emerald-950/30 cf:p-4">
			<CheckCircle2 className="cf:size-5 cf:text-emerald-200" />
			<div>
				<p className="cf:text-sm cf:font-black cf:text-emerald-100">Leave request created</p>
				<p className="cf:text-sm cf:font-medium cf:text-emerald-50">
					{props.leaveRequest.startDate} → {props.leaveRequest.endDate} ·{' '}
					{formatLabel(props.leaveRequest.status)}
				</p>
			</div>
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
			className={cn(
				'cf:rounded-2xl cf:border cf:px-4 cf:py-3 cf:text-sm cf:font-black',
				isError
					? 'cf:border-red-300/25 cf:bg-red-950/30 cf:text-red-100'
					: 'cf:border-amber-300/25 cf:bg-amber-950/30 cf:text-amber-100',
			)}
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
 * updateForm merges partial form values.
 */
function updateForm(setForm: Dispatch<SetStateAction<LeaveFormState>>, patch: Partial<LeaveFormState>): void {
	setForm(current => ({
		...current,
		...patch,
	}));
}

/**
 * normalizeDurationMode returns a form patch for one duration mode.
 */
function normalizeDurationMode(value: string): Partial<LeaveFormState> {
	if (value === 'half_day') {
		return {
			durationMode: 'half_day',
			startTime: '',
			endTime: '',
		};
	}

	if (value === 'hourly') {
		return {
			durationMode: 'hourly',
			halfDayPart: '',
		};
	}

	return {
		durationMode: 'full_day',
		halfDayPart: '',
		startTime: '',
		endTime: '',
	};
}

/**
 * validateForm performs frontend-only validation.
 */
function validateForm(form: LeaveFormState): string | null {
	if (form.leaveTypeID.trim() === '') {
		return 'Choose a leave type.';
	}

	if (form.startDate.trim() === '' || form.endDate.trim() === '') {
		return 'Choose a start and end date.';
	}

	if (form.startDate > form.endDate) {
		return 'Start date cannot be after end date.';
	}

	if (form.durationMode === 'half_day' && form.halfDayPart === '') {
		return 'Choose morning or afternoon for half-day leave.';
	}

	if (form.durationMode === 'hourly') {
		if (form.startTime.trim() === '' || form.endTime.trim() === '') {
			return 'Choose start and end time for hourly leave.';
		}

		if (form.startTime >= form.endTime) {
			return 'Hourly leave start time must be before end time.';
		}
	}

	return null;
}

/**
 * hasUsableDateRange returns true when a form has a usable date range.
 */
function hasUsableDateRange(form: LeaveFormState): boolean {
	return form.startDate.trim() !== '' && form.endDate.trim() !== '' && form.startDate <= form.endDate;
}

/**
 * buildWarnings creates local warning messages before submission.
 */
function buildWarnings(
	form: LeaveFormState,
	myActiveLeaves: readonly PendingLeaveRequest[],
	approvedLeaves: readonly ApprovedLeaveRequest[],
	serverValid: boolean,
): readonly LeaveConflictWarning[] {
	const warnings: LeaveConflictWarning[] = [];

	if (!serverValid) {
		warnings.push({
			kind: 'validation',
			message: 'The backend validation found a conflict for this request.',
		});
	}

	const ownOverlap = myActiveLeaves.some(row =>
		overlapsDateRange(row.leaveRequest.startDate, row.leaveRequest.endDate, form.startDate, form.endDate),
	);

	if (ownOverlap) {
		warnings.push({
			kind: 'own_overlap',
			message: 'You already have an active leave request overlapping this date range.',
		});
	}

	if (approvedLeaves.length >= 3) {
		warnings.push({
			kind: 'many_people_out',
			message: `${approvedLeaves.length} approved leave rows already overlap this range.`,
		});
	}

	const sameDay = approvedLeaves.some(
		row => row.leaveRequest.startDate === form.startDate || row.leaveRequest.endDate === form.endDate,
	);
	if (sameDay) {
		warnings.push({
			kind: 'existing_same_day',
			message: 'At least one approved leave starts or ends on the same day.',
		});
	}

	if (form.backupUserID.trim() !== '') {
		const backupUnavailable = approvedLeaves.some(row => row.leaveRequest.userId === form.backupUserID.trim());
		if (backupUnavailable) {
			warnings.push({
				kind: 'backup_unavailable',
				message: 'The backup user appears to be on approved leave in this date range.',
			});
		}
	}

	return warnings;
}

/**
 * overlapsDateRange returns true when two inclusive local-date ranges overlap.
 */
function overlapsDateRange(startDate: string, endDate: string, rangeStart: string, rangeEnd: string): boolean {
	return startDate <= rangeEnd && endDate >= rangeStart;
}

/**
 * selectClassName returns the shared native select style.
 */
function selectClassName(): string {
	return cn(
		'cf:h-10 cf:w-full cf:rounded-md cf:border cf:border-input cf:bg-background cf:px-3 cf:py-2 cf:text-sm cf:text-foreground cf:outline-none',
		'cf:focus-visible:border-ring cf:focus-visible:ring-ring/50 cf:focus-visible:ring-3',
		'cf:disabled:cursor-not-allowed cf:disabled:opacity-50',
	);
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
