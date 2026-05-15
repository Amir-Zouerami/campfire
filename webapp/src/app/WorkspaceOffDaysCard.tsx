import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from 'react';

import { ApiClientError, createWorkspaceOffDay, deleteWorkspaceOffDay, listWorkspaceOffDays } from '../api/client';
import type { Workspace, WorkspaceOffDay } from '../types/domain';

const workspaceOffDayDateInputID = 'campfire-workspace-offday-date';
const workspaceOffDayLabelInputID = 'campfire-workspace-offday-label';

/**
 * WorkspaceOffDaysCardProps contains workspace calendar settings data.
 */
type WorkspaceOffDaysCardProps = {
	readonly workspace: Workspace;
	readonly canManageWorkspace: boolean;
	readonly refreshToken: number;
	readonly onOffDaysChanged: () => void;
};

/**
 * LoadState describes the workspace off-days card loading status.
 */
type LoadState = 'idle' | 'loading' | 'ready' | 'saving' | 'deleting' | 'error';

/**
 * WorkspaceOffDaysCard lets workspace Leads manage channel-specific off-days.
 *
 * Workspace off-days suppress standup automation only for this workspace.
 */
export function WorkspaceOffDaysCard(props: WorkspaceOffDaysCardProps): ReactElement {
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [offDays, setOffDays] = useState<readonly WorkspaceOffDay[]>([]);
	const [date, setDate] = useState('');
	const [label, setLabel] = useState('');
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * Loads workspace-specific off-days.
		 */
		async function loadOffDays(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const response = await listWorkspaceOffDays(props.workspace.id);

				if (!isActive) {
					return;
				}

				setOffDays(response.offDays);
				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setMessage(errorToMessage(error));
				setLoadState('error');
			}
		}

		void loadOffDays();

		return () => {
			isActive = false;
		};
	}, [props.workspace.id, props.refreshToken]);

	const sortedOffDays = useMemo(() => sortWorkspaceOffDays(offDays), [offDays]);

	/**
	 * Creates a workspace off-day from the form.
	 */
	async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();

		if (!props.canManageWorkspace) {
			setMessage('Only workspace Leads and system admins can manage workspace off-days.');
			return;
		}

		const cleanDate = date.trim();
		const cleanLabel = label.trim();

		if (cleanDate === '' || cleanLabel === '') {
			setMessage('Choose a date and enter a label.');
			return;
		}

		setLoadState('saving');
		setMessage('');

		try {
			const response = await createWorkspaceOffDay(props.workspace.id, {
				date: cleanDate,
				label: cleanLabel,
			});

			setOffDays(current => sortWorkspaceOffDays([...current, response.offDay]));
			setDate('');
			setLabel('');
			setLoadState('ready');
			setMessage('Workspace off-day added.');
			props.onOffDaysChanged();
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	/**
	 * Deletes a workspace off-day.
	 */
	async function handleDelete(offDayID: string): Promise<void> {
		if (!props.canManageWorkspace) {
			setMessage('Only workspace Leads and system admins can manage workspace off-days.');
			return;
		}

		setLoadState('deleting');
		setMessage('');

		try {
			await deleteWorkspaceOffDay(props.workspace.id, offDayID);

			setOffDays(current => current.filter(offDay => offDay.id !== offDayID));
			setLoadState('ready');
			setMessage('Workspace off-day removed.');
			props.onOffDaysChanged();
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	const isBusy = loadState === 'loading' || loadState === 'saving' || loadState === 'deleting';

	return (
		<section className="cf:mt-5 cf:rounded-3xl cf:border cf:border-orange-300/20 cf:bg-white/[0.055] cf:p-6 cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
			<div className="cf:grid cf:gap-5 cf:sm:grid-cols-[1fr_auto] cf:sm:items-start">
				<div>
					<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-orange-200">
						Workspace calendar
					</p>
					<h2 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
						Workspace off-days
					</h2>
					<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">
						Add channel-specific holidays, shutdowns, or no-standup days for {props.workspace.name}. These
						dates suppress scheduled standup work for this workspace only.
					</p>
				</div>

				<div className="cf:w-fit cf:rounded-full cf:border cf:border-orange-300/25 cf:bg-orange-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-orange-200">
					{offDays.length} dates
				</div>
			</div>

			{!props.canManageWorkspace && (
				<p className="cf:m-0 cf:mt-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-3 cf:text-sm cf:leading-6 cf:text-slate-300">
					You can view workspace off-days, but only workspace Leads and system admins can change them.
				</p>
			)}

			{props.canManageWorkspace && (
				<form
					className="cf:mt-5 cf:grid cf:gap-3 cf:lg:grid-cols-[180px_1fr_auto]"
					onSubmit={event => void handleCreate(event)}
				>
					<div>
						<label
							className="cf:mb-1.5 cf:block cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-slate-300"
							htmlFor={workspaceOffDayDateInputID}
						>
							Date
						</label>
						<input
							className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:transition cf:focus:border-orange-300/45"
							disabled={isBusy}
							id={workspaceOffDayDateInputID}
							type="date"
							value={date}
							onChange={event => setDate(event.currentTarget.value)}
						/>
					</div>

					<div>
						<label
							className="cf:mb-1.5 cf:block cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-slate-300"
							htmlFor={workspaceOffDayLabelInputID}
						>
							Label
						</label>
						<input
							className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:transition cf:placeholder:text-slate-500 cf:focus:border-orange-300/45"
							disabled={isBusy}
							id={workspaceOffDayLabelInputID}
							placeholder="Team offsite, local holiday, release freeze..."
							type="text"
							value={label}
							onChange={event => setLabel(event.currentTarget.value)}
						/>
					</div>

					<div className="cf:flex cf:items-end">
						<button
							className="cf:w-full cf:rounded-2xl cf:border cf:border-orange-300/30 cf:bg-orange-400/20 cf:px-5 cf:py-3 cf:font-black cf:text-orange-50 cf:transition cf:hover:bg-orange-400/30 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
							disabled={isBusy}
							type="submit"
						>
							Add off-day
						</button>
					</div>
				</form>
			)}

			{message !== '' && <p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{message}</p>}

			<div className="cf:mt-5 cf:grid cf:gap-3">
				{loadState === 'loading' && <p className="cf:m-0 cf:text-slate-300">Loading workspace off-days…</p>}

				{loadState !== 'loading' && sortedOffDays.length === 0 && (
					<p className="cf:m-0 cf:rounded-2xl cf:border cf:border-dashed cf:border-white/10 cf:p-4 cf:text-slate-300">
						No workspace off-days have been added yet.
					</p>
				)}

				{sortedOffDays.map(offDay => (
					<article
						className="cf:flex cf:flex-col cf:gap-3 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4 cf:sm:flex-row cf:sm:items-center cf:sm:justify-between"
						key={offDay.id}
					>
						<div>
							<strong className="cf:block cf:text-base cf:font-black cf:text-white">
								{offDay.label}
							</strong>
							<p className="cf:m-0 cf:mt-1 cf:text-sm cf:text-slate-300">{offDay.date}</p>
						</div>

						{props.canManageWorkspace && (
							<button
								className="cf:w-fit cf:rounded-2xl cf:border cf:border-red-300/25 cf:bg-red-400/15 cf:px-4 cf:py-2 cf:text-sm cf:font-black cf:text-red-50 cf:transition cf:hover:bg-red-400/25 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
								disabled={isBusy}
								type="button"
								onClick={() => void handleDelete(offDay.id)}
							>
								Delete
							</button>
						)}
					</article>
				))}
			</div>
		</section>
	);
}

/**
 * sortWorkspaceOffDays returns workspace off-days ordered by date.
 */
function sortWorkspaceOffDays(offDays: readonly WorkspaceOffDay[]): readonly WorkspaceOffDay[] {
	return [...offDays].sort((first, second) => {
		if (first.date === second.date) {
			return first.label.localeCompare(second.label);
		}

		return first.date.localeCompare(second.date);
	});
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

	return 'Could not update workspace off-days.';
}
