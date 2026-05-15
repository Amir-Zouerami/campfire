import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';

import { ApiClientError, createLeaveRequest, listLeaveTypes } from '../api/client';
import type { LeaveDurationMode, LeaveHalfDayPart, LeaveRequest, LeaveType, Workspace } from '../types/domain';

/**
 * LeaveRequestCardProps contains the workspace used for leave requests.
 */
type LeaveRequestCardProps = {
	readonly workspace: Workspace;
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
 * LoadState describes the leave panel loading status.
 */
type LoadState = 'idle' | 'loading' | 'ready' | 'saving' | 'error';

/**
 * LeaveRequestCard renders a first-pass leave request experience.
 */
export function LeaveRequestCard(props: LeaveRequestCardProps): ReactElement {
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [leaveTypes, setLeaveTypes] = useState<readonly LeaveType[]>([]);
	const [createdLeaveRequest, setCreatedLeaveRequest] = useState<LeaveRequest | null>(null);
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

		async function loadTypes(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const response = await listLeaveTypes(props.workspace.id);

				if (!isActive) {
					return;
				}

				setLeaveTypes(response.leaveTypes);
				setForm(current => ({
					...current,
					leaveTypeID: current.leaveTypeID || response.leaveTypes[0]?.id || '',
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

		void loadTypes();

		return () => {
			isActive = false;
		};
	}, [props.workspace.id]);

	const selectedLeaveType = useMemo(
		() => leaveTypes.find(leaveType => leaveType.id === form.leaveTypeID) ?? null,
		[form.leaveTypeID, leaveTypes],
	);

	/**
	 * Creates a pending leave request.
	 */
	async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();

		if (form.leaveTypeID.trim() === '') {
			setMessage('Choose a leave type.');
			return;
		}

		if (form.startDate.trim() === '' || form.endDate.trim() === '') {
			setMessage('Choose a start and end date.');
			return;
		}

		setLoadState('saving');
		setMessage('');
		setCreatedLeaveRequest(null);

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
				reason: form.reason,
				backupUserId: form.backupUserID,
			});

			setCreatedLeaveRequest(response.leaveRequest);
			setLoadState('ready');
			setMessage('Leave request created and sent to approvers.');
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
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	const isBusy = loadState === 'loading' || loadState === 'saving';

	return (
		<section className="cf:mt-5 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-white/[0.055] cf:p-6 cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
			<div className="cf:grid cf:gap-5 cf:lg:grid-cols-[1fr_auto] cf:lg:items-start">
				<div>
					<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-amber-300">
						Leaves
					</p>
					<h2 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
						Request leave
					</h2>
					<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">
						All leave types require approval. Campfire blocks requests that overlap global off-days before
						approvers are notified.
					</p>
				</div>

				{selectedLeaveType !== null && (
					<div className="cf:w-fit cf:rounded-full cf:border cf:border-orange-300/25 cf:bg-orange-400/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-orange-200">
						{selectedLeaveType.name}
					</div>
				)}
			</div>

			<form className="cf:mt-6 cf:grid cf:gap-4" onSubmit={handleSubmit}>
				<div className="cf:grid cf:gap-4 cf:lg:grid-cols-3">
					<Field label="Leave type">
						<select
							className={inputClassName}
							value={form.leaveTypeID}
							disabled={isBusy}
							onChange={event => updateForm(setForm, { leaveTypeID: event.currentTarget.value })}
						>
							{leaveTypes.map(leaveType => (
								<option key={leaveType.id} value={leaveType.id}>
									{leaveType.name}
								</option>
							))}
						</select>
					</Field>

					<Field label="Start date">
						<input
							className={inputClassName}
							type="date"
							value={form.startDate}
							disabled={isBusy}
							onChange={event => updateForm(setForm, { startDate: event.currentTarget.value })}
						/>
					</Field>

					<Field label="End date">
						<input
							className={inputClassName}
							type="date"
							value={form.endDate}
							disabled={isBusy}
							onChange={event => updateForm(setForm, { endDate: event.currentTarget.value })}
						/>
					</Field>
				</div>

				<div className="cf:grid cf:gap-4 cf:lg:grid-cols-3">
					<Field label="Duration">
						<select
							className={inputClassName}
							value={form.durationMode}
							disabled={isBusy}
							onChange={event => {
								const value = event.currentTarget.value;

								if (isLeaveDurationMode(value)) {
									updateForm(setForm, {
										durationMode: value,
										halfDayPart: '',
										startTime: '',
										endTime: '',
									});
								}
							}}
						>
							<option value="full_day">Full day</option>
							<option value="half_day">Half day</option>
							<option value="hourly">Hourly</option>
						</select>
					</Field>

					{form.durationMode === 'half_day' && (
						<Field label="Half day">
							<select
								className={inputClassName}
								value={form.halfDayPart}
								disabled={isBusy}
								onChange={event => {
									const value = event.currentTarget.value;

									if (value === '' || isLeaveHalfDayPart(value)) {
										updateForm(setForm, { halfDayPart: value });
									}
								}}
							>
								<option value="">Choose...</option>
								<option value="morning">Morning</option>
								<option value="afternoon">Afternoon</option>
							</select>
						</Field>
					)}

					{form.durationMode === 'hourly' && (
						<>
							<Field label="Start time">
								<input
									className={inputClassName}
									type="time"
									value={form.startTime}
									disabled={isBusy}
									onChange={event => updateForm(setForm, { startTime: event.currentTarget.value })}
								/>
							</Field>

							<Field label="End time">
								<input
									className={inputClassName}
									type="time"
									value={form.endTime}
									disabled={isBusy}
									onChange={event => updateForm(setForm, { endTime: event.currentTarget.value })}
								/>
							</Field>
						</>
					)}
				</div>

				<div className="cf:grid cf:gap-4 cf:lg:grid-cols-2">
					<Field label="Reason">
						<textarea
							className={`${inputClassName} cf:min-h-24 cf:resize-y`}
							value={form.reason}
							placeholder="Optional context for approvers..."
							disabled={isBusy}
							onChange={event => updateForm(setForm, { reason: event.currentTarget.value })}
						/>
					</Field>

					<Field label="Backup user ID">
						<input
							className={inputClassName}
							type="text"
							value={form.backupUserID}
							placeholder="Optional Mattermost user ID for now"
							disabled={isBusy}
							onChange={event => updateForm(setForm, { backupUserID: event.currentTarget.value })}
						/>
					</Field>
				</div>

				<div className="cf:flex cf:flex-col cf:gap-3 cf:sm:flex-row cf:sm:items-center">
					<button
						className="cf:w-fit cf:rounded-2xl cf:border cf:border-orange-300/25 cf:bg-gradient-to-br cf:from-orange-500 cf:to-amber-300 cf:px-5 cf:py-3 cf:font-black cf:text-slate-950 cf:shadow-[0_18px_50px_rgba(249,115,22,0.18)] cf:transition cf:hover:brightness-110 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
						type="submit"
						disabled={isBusy || leaveTypes.length === 0}
					>
						Request leave
					</button>

					{message !== '' && <p className="cf:m-0 cf:text-sm cf:font-bold cf:text-amber-300">{message}</p>}
				</div>
			</form>

			{createdLeaveRequest !== null && (
				<article className="cf:mt-5 cf:rounded-3xl cf:border cf:border-emerald-300/20 cf:bg-emerald-400/10 cf:p-4">
					<strong className="cf:block cf:text-emerald-100">Pending approval</strong>
					<p className="cf:m-0 cf:mt-1 cf:text-sm cf:text-emerald-50/90">
						Request {createdLeaveRequest.id} is pending. Approvers have been notified.
					</p>
				</article>
			)}
		</section>
	);
}

const inputClassName =
	'cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/55 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:transition cf:[color-scheme:dark] cf:placeholder:text-slate-500 cf:focus:border-orange-400/60 cf:focus:ring-4 cf:focus:ring-orange-400/15 cf:disabled:cursor-not-allowed cf:disabled:opacity-60';

/**
 * Field renders a labeled form control.
 */
function Field(props: { readonly label: string; readonly children: ReactElement }): ReactElement {
	return (
		<label className="cf:grid cf:gap-2">
			<span className="cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.14em] cf:text-amber-300">
				{props.label}
			</span>
			{props.children}
		</label>
	);
}

/**
 * updateForm merges partial form changes.
 */
function updateForm(
	setForm: (updater: (current: LeaveFormState) => LeaveFormState) => void,
	patch: Partial<LeaveFormState>,
): void {
	setForm(current => ({
		...current,
		...patch,
	}));
}

/**
 * isLeaveDurationMode narrows strings to supported leave duration modes.
 */
function isLeaveDurationMode(value: string): value is LeaveDurationMode {
	return value === 'full_day' || value === 'half_day' || value === 'hourly';
}

/**
 * isLeaveHalfDayPart narrows strings to supported half-day parts.
 */
function isLeaveHalfDayPart(value: string): value is LeaveHalfDayPart {
	return value === 'morning' || value === 'afternoon';
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

	return 'Could not request leave.';
}
