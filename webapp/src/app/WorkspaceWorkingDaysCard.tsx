import { useEffect, useMemo, useState, type ReactElement } from 'react';

import { ApiClientError, listWorkspaceWorkingDays, updateWorkspaceWorkingDays } from '../api/client';
import type { Workspace, WorkspaceWorkingDay } from '../types/domain';

const weekdayLabels = [
	{ weekday: 0, shortName: 'Sun', longName: 'Sunday' },
	{ weekday: 1, shortName: 'Mon', longName: 'Monday' },
	{ weekday: 2, shortName: 'Tue', longName: 'Tuesday' },
	{ weekday: 3, shortName: 'Wed', longName: 'Wednesday' },
	{ weekday: 4, shortName: 'Thu', longName: 'Thursday' },
	{ weekday: 5, shortName: 'Fri', longName: 'Friday' },
	{ weekday: 6, shortName: 'Sat', longName: 'Saturday' },
] as const;

/**
 * WorkspaceWorkingDaysCardProps contains workspace calendar configuration data.
 */
type WorkspaceWorkingDaysCardProps = {
	readonly workspace: Workspace;
	readonly canManageWorkspace: boolean;
	readonly refreshToken: number;
	readonly onWorkingDaysChanged: () => void;
};

/**
 * LoadState describes the workspace working-days panel state.
 */
type LoadState = 'idle' | 'loading' | 'ready' | 'saving' | 'error';

/**
 * WorkspaceWorkingDaysCard lets workspace Leads configure which weekdays count as working days.
 */
export function WorkspaceWorkingDaysCard(props: WorkspaceWorkingDaysCardProps): ReactElement {
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [workingDays, setWorkingDays] = useState<readonly WorkspaceWorkingDay[]>([]);
	const [selectedWeekdays, setSelectedWeekdays] = useState<readonly number[]>([]);
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * Loads workspace working-day settings.
		 */
		async function loadWorkingDays(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const response = await listWorkspaceWorkingDays(props.workspace.id);

				if (!isActive) {
					return;
				}

				setWorkingDays(response.workingDays);
				setSelectedWeekdays(enabledWeekdaysFromRows(response.workingDays));
				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setMessage(errorToMessage(error));
				setLoadState('error');
			}
		}

		void loadWorkingDays();

		return () => {
			isActive = false;
		};
	}, [props.workspace.id, props.refreshToken]);

	const selectedSet = useMemo(() => new Set(selectedWeekdays), [selectedWeekdays]);
	const isBusy = loadState === 'loading' || loadState === 'saving';
	const hasChanges = !sameWeekdays(selectedWeekdays, enabledWeekdaysFromRows(workingDays));

	/**
	 * Toggles one weekday in the local draft.
	 */
	function toggleWeekday(weekday: number): void {
		if (!props.canManageWorkspace || isBusy) {
			return;
		}

		setSelectedWeekdays(current => {
			const currentSet = new Set(current);

			if (currentSet.has(weekday)) {
				currentSet.delete(weekday);
			} else {
				currentSet.add(weekday);
			}

			return [...currentSet].sort((first, second) => first - second);
		});
	}

	/**
	 * Saves the selected working days.
	 */
	async function handleSave(): Promise<void> {
		if (!props.canManageWorkspace) {
			setMessage('Only workspace Leads and system admins can manage working days.');
			return;
		}

		if (selectedWeekdays.length === 0) {
			setMessage('Choose at least one working day.');
			return;
		}

		setLoadState('saving');
		setMessage('');

		try {
			const response = await updateWorkspaceWorkingDays(props.workspace.id, {
				workingDays: selectedWeekdays,
			});

			setWorkingDays(response.workingDays);
			setSelectedWeekdays(enabledWeekdaysFromRows(response.workingDays));
			setLoadState('ready');
			setMessage('Working days updated.');
			props.onWorkingDaysChanged();
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
						Workspace rhythm
					</p>
					<h2 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
						Working days
					</h2>
					<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">
						Choose the weekdays when Campfire should expect standups and include people in missing-user
						checks for {props.workspace.name}.
					</p>
				</div>

				<div className="cf:w-fit cf:rounded-full cf:border cf:border-emerald-300/25 cf:bg-emerald-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-emerald-200">
					{selectedWeekdays.length} selected
				</div>
			</div>

			{!props.canManageWorkspace && (
				<p className="cf:m-0 cf:mt-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-3 cf:text-sm cf:leading-6 cf:text-slate-300">
					You can view working days, but only workspace Leads and system admins can change them.
				</p>
			)}

			<div className="cf:mt-5 cf:grid cf:gap-3 cf:sm:grid-cols-2 cf:lg:grid-cols-7">
				{weekdayLabels.map(day => {
					const selected = selectedSet.has(day.weekday);

					return (
						<button
							className={weekdayButtonClassName(selected)}
							disabled={isBusy || !props.canManageWorkspace}
							key={day.weekday}
							type="button"
							onClick={() => toggleWeekday(day.weekday)}
						>
							<span className="cf:block cf:text-lg cf:font-black">{day.shortName}</span>
							<span className="cf:mt-1 cf:block cf:text-xs cf:font-bold cf:opacity-80">
								{day.longName}
							</span>
						</button>
					);
				})}
			</div>

			{message !== '' && <p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{message}</p>}

			{props.canManageWorkspace && (
				<div className="cf:mt-5 cf:flex cf:flex-wrap cf:items-center cf:gap-3">
					<button
						className="cf:rounded-2xl cf:border cf:border-emerald-300/30 cf:bg-emerald-400/20 cf:px-5 cf:py-3 cf:font-black cf:text-emerald-50 cf:transition cf:hover:bg-emerald-400/30 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
						disabled={isBusy || !hasChanges}
						type="button"
						onClick={() => void handleSave()}
					>
						{loadState === 'saving' ? 'Saving…' : 'Save working days'}
					</button>

					{hasChanges && (
						<span className="cf:text-sm cf:font-bold cf:text-slate-300">Unsaved working-day changes</span>
					)}
				</div>
			)}
		</section>
	);
}

/**
 * enabledWeekdaysFromRows returns enabled weekday numbers from API rows.
 */
function enabledWeekdaysFromRows(rows: readonly WorkspaceWorkingDay[]): readonly number[] {
	return rows
		.filter(row => row.enabled)
		.map(row => row.weekday)
		.sort((first, second) => first - second);
}

/**
 * sameWeekdays returns true when two weekday lists contain the same values in the same order.
 */
function sameWeekdays(first: readonly number[], second: readonly number[]): boolean {
	if (first.length !== second.length) {
		return false;
	}

	return first.every((weekday, index) => weekday === second[index]);
}

/**
 * weekdayButtonClassName returns the visual class name for a weekday toggle.
 */
function weekdayButtonClassName(selected: boolean): string {
	const baseClassName =
		'cf:rounded-2xl cf:border cf:px-4 cf:py-4 cf:text-left cf:transition cf:disabled:cursor-not-allowed cf:disabled:opacity-60';

	if (selected) {
		return `${baseClassName} cf:border-emerald-300/35 cf:bg-emerald-400/20 cf:text-emerald-50`;
	}

	return `${baseClassName} cf:border-white/10 cf:bg-slate-950/40 cf:text-slate-300 cf:hover:bg-white/10`;
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

	return 'Could not update workspace working days.';
}
