import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { CalendarDays, CheckCircle2, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

import { ApiClientError, listWorkspaceWorkingDays, updateWorkspaceWorkingDays } from '@/api';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Workspace, WorkspaceWorkingDay } from '@/types/domain';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireEmpty,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from './campfire-ui';

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

const weekdayOptions = [
	{ weekday: 0, shortName: 'Sun', longName: 'Sunday' },
	{ weekday: 1, shortName: 'Mon', longName: 'Monday' },
	{ weekday: 2, shortName: 'Tue', longName: 'Tuesday' },
	{ weekday: 3, shortName: 'Wed', longName: 'Wednesday' },
	{ weekday: 4, shortName: 'Thu', longName: 'Thursday' },
	{ weekday: 5, shortName: 'Fri', longName: 'Friday' },
	{ weekday: 6, shortName: 'Sat', longName: 'Saturday' },
] as const;

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
				setSelectedWeekdays(
					response.workingDays
						.filter(workingDay => workingDay.enabled)
						.map(workingDay => workingDay.weekday)
						.sort((first, second) => first - second),
				);
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

	const savedWeekdays = useMemo(() => {
		return workingDays
			.filter(workingDay => workingDay.enabled)
			.map(workingDay => workingDay.weekday)
			.sort((first, second) => first - second);
	}, [workingDays]);

	const changed = useMemo(() => !sameNumbers(savedWeekdays, selectedWeekdays), [savedWeekdays, selectedWeekdays]);
	const selectedLabels = useMemo(() => selectedWeekdays.map(weekdayToShortName).join(', '), [selectedWeekdays]);
	const isBusy = loadState === 'loading' || loadState === 'saving';

	/**
	 * Toggles one weekday in the draft selection.
	 */
	function toggleWeekday(weekday: number): void {
		setSelectedWeekdays(current => {
			if (current.includes(weekday)) {
				return current.filter(value => value !== weekday);
			}

			return [...current, weekday].sort((first, second) => first - second);
		});
	}

	/**
	 * Saves the selected working days.
	 */
	async function handleSave(): Promise<void> {
		if (!props.canManageWorkspace) {
			setLoadState('error');
			setMessage('Only workspace Leads and system admins can manage working days.');
			return;
		}

		if (selectedWeekdays.length === 0) {
			setLoadState('error');
			setMessage('Choose at least one working day.');
			return;
		}

		setLoadState('saving');
		setMessage('');

		try {
			const response = await updateWorkspaceWorkingDays(props.workspace.id, {
				workingDays: [...selectedWeekdays],
			});

			setWorkingDays(response.workingDays);
			setSelectedWeekdays(
				response.workingDays
					.filter(workingDay => workingDay.enabled)
					.map(workingDay => workingDay.weekday)
					.sort((first, second) => first - second),
			);
			setLoadState('ready');
			setMessage('Working days updated.');
			toast.success('Working days updated');
			props.onWorkingDaysChanged();
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);
			setMessage(errorMessage);
			setLoadState('error');
			toast.error(errorMessage);
		}
	}

	return (
		<CampfirePanel className="cf:overflow-hidden">
			<CampfireCardHeader
				eyebrow="Calendar"
				title="Working days"
				description="Choose which weekdays count as normal workdays. Standup automation uses this before checking off-days and leave."
				icon={CalendarDays}
				action={
					<CampfireStatusPill tone={changed ? 'ember' : 'green'}>
						{changed ? 'Unsaved changes' : 'Saved'}
					</CampfireStatusPill>
				}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
				<div className="cf:grid cf:gap-3 cf:md:grid-cols-3">
					<CampfireMetric
						label="Selected"
						value={String(selectedWeekdays.length)}
						helper={selectedLabels || 'None'}
					/>
					<CampfireMetric
						label="Saved"
						value={String(savedWeekdays.length)}
						helper={savedWeekdays.map(weekdayToShortName).join(', ') || 'None'}
					/>
					<CampfireMetric
						label="Timezone"
						value={props.workspace.timezone}
						helper="Workspace local calendar"
					/>
				</div>

				{message !== '' && <MessageRow state={loadState} message={message} />}
				{loadState === 'loading' && <LoadingRow label="Loading working days…" />}

				{!props.canManageWorkspace && (
					<MessageRow state="error" message="You can view working days, but you cannot edit them." />
				)}

				<div className="cf:grid cf:grid-cols-2 cf:gap-3 cf:sm:grid-cols-4 cf:xl:grid-cols-7">
					{weekdayOptions.map(option => (
						<button
							key={option.weekday}
							type="button"
							disabled={isBusy || !props.canManageWorkspace}
							className={weekdayButtonClassName(selectedWeekdays.includes(option.weekday))}
							onClick={() => toggleWeekday(option.weekday)}
						>
							<span className="cf:text-xl cf:font-black">{option.shortName}</span>
							<span className="cf:mt-1 cf:text-xs cf:font-black cf:uppercase cf:tracking-widest cf:opacity-80">
								{option.longName}
							</span>
						</button>
					))}
				</div>

				<Separator className="cf:bg-white/10" />

				<div className="cf:flex cf:flex-col cf:gap-3 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4 cf:sm:flex-row cf:sm:items-center cf:sm:justify-between">
					<div>
						<p className="cf:text-sm cf:font-black cf:text-white">Calendar impact</p>
						<p className="cf:mt-1 cf:text-sm cf:font-medium cf:leading-6 cf:text-slate-400">
							Daily standups skip non-working days when the schedule enables that setting. Weekly runs use
							the backend working-day rules.
						</p>
					</div>

					<Button
						type="button"
						disabled={isBusy || !props.canManageWorkspace || !changed}
						onClick={() => void handleSave()}
					>
						{loadState === 'saving' ? (
							<Loader2 className="cf:size-4 cf:animate-spin" />
						) : (
							<Save className="cf:size-4" />
						)}
						Save days
					</Button>
				</div>

				{loadState !== 'loading' && workingDays.length === 0 && (
					<CampfireEmpty
						icon={CalendarDays}
						title="No working-day rows returned"
						description="The workspace exists, but the backend did not return working-day settings."
					/>
				)}
			</CampfireCardBody>
		</CampfirePanel>
	);
}

/**
 * MessageRow renders load/save feedback.
 */
function MessageRow(props: { readonly state: LoadState; readonly message: string }): ReactElement {
	const isError = props.state === 'error';

	return (
		<div
			className={cn(
				'cf:flex cf:items-center cf:gap-2 cf:rounded-2xl cf:border cf:px-4 cf:py-3 cf:text-sm cf:font-black',
				isError
					? 'cf:border-red-300/25 cf:bg-red-950/30 cf:text-red-100'
					: 'cf:border-amber-300/25 cf:bg-amber-950/30 cf:text-amber-100',
			)}
		>
			{isError ? null : <CheckCircle2 className="cf:size-4" />}
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
 * weekdayButtonClassName returns classes for one weekday toggle.
 */
function weekdayButtonClassName(selected: boolean): string {
	const baseClassName =
		'cf:flex cf:min-h-24 cf:flex-col cf:items-center cf:justify-center cf:rounded-3xl cf:border cf:px-4 cf:py-3 cf:text-center cf:transition cf:disabled:cursor-not-allowed cf:disabled:opacity-60';

	if (selected) {
		return cn(baseClassName, 'cf:border-orange-300/40 cf:bg-orange-400/20 cf:text-orange-50 cf:shadow-xl');
	}

	return cn(
		baseClassName,
		'cf:border-white/10 cf:bg-white/5 cf:text-slate-300 cf:hover:bg-white/10 cf:hover:text-white',
	);
}

/**
 * sameNumbers compares two sorted or unsorted numeric arrays.
 */
function sameNumbers(first: readonly number[], second: readonly number[]): boolean {
	if (first.length !== second.length) {
		return false;
	}

	const sortedFirst = [...first].sort((left, right) => left - right);
	const sortedSecond = [...second].sort((left, right) => left - right);

	return sortedFirst.every((value, index) => value === sortedSecond[index]);
}

/**
 * weekdayToShortName returns a short weekday label.
 */
function weekdayToShortName(weekday: number): string {
	return weekdayOptions.find(option => option.weekday === weekday)?.shortName ?? String(weekday);
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

	return 'Could not update working days.';
}
