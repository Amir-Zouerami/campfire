import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { CalendarX2, CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { ApiClientError, createWorkspaceOffDay, deleteWorkspaceOffDay, listWorkspaceOffDays } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Workspace, WorkspaceOffDay } from '@/types/domain';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireEmpty,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from './campfire-ui';

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
 */
export function WorkspaceOffDaysCard(props: WorkspaceOffDaysCardProps): ReactElement {
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [offDays, setOffDays] = useState<readonly WorkspaceOffDay[]>([]);
	const [date, setDate] = useState('');
	const [label, setLabel] = useState('');
	const [deletingID, setDeletingID] = useState('');
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
	const upcomingOffDays = useMemo(
		() => sortedOffDays.filter(offDay => offDay.date >= getTodayLocalDateString()),
		[sortedOffDays],
	);
	const isBusy = loadState === 'loading' || loadState === 'saving' || loadState === 'deleting';

	/**
	 * Creates a workspace off-day from the form.
	 */
	async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();

		if (!props.canManageWorkspace) {
			setLoadState('error');
			setMessage('Only workspace Leads and system admins can manage workspace off-days.');
			return;
		}

		const cleanDate = date.trim();
		const cleanLabel = label.trim();

		if (cleanDate === '') {
			setLoadState('error');
			setMessage('Choose an off-day date.');
			return;
		}

		if (cleanLabel === '') {
			setLoadState('error');
			setMessage('Off-day label is required.');
			return;
		}

		setLoadState('saving');
		setMessage('');

		try {
			const response = await createWorkspaceOffDay(props.workspace.id, {
				date: cleanDate,
				label: cleanLabel,
			});

			setOffDays(current => [response.offDay, ...current]);
			setDate('');
			setLabel('');
			setLoadState('ready');
			setMessage('Workspace off-day created.');
			toast.success('Workspace off-day created');
			props.onOffDaysChanged();
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);
			setMessage(errorMessage);
			setLoadState('error');
			toast.error(errorMessage);
		}
	}

	/**
	 * Deletes a workspace off-day.
	 */
	async function handleDelete(offDayID: string): Promise<void> {
		if (!props.canManageWorkspace) {
			setLoadState('error');
			setMessage('Only workspace Leads and system admins can manage workspace off-days.');
			return;
		}

		setLoadState('deleting');
		setDeletingID(offDayID);
		setMessage('');

		try {
			await deleteWorkspaceOffDay(props.workspace.id, offDayID);

			setOffDays(current => current.filter(offDay => offDay.id !== offDayID));
			setLoadState('ready');
			setDeletingID('');
			setMessage('Workspace off-day deleted.');
			toast.success('Workspace off-day deleted');
			props.onOffDaysChanged();
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);
			setMessage(errorMessage);
			setLoadState('error');
			setDeletingID('');
			toast.error(errorMessage);
		}
	}

	return (
		<CampfirePanel className="cf:overflow-hidden">
			<CampfireCardHeader
				eyebrow="Workspace off-days"
				title="Workspace holidays and skip dates"
				description="Add channel-specific no-standup dates. These apply only to this workspace."
				icon={CalendarX2}
				action={<CampfireStatusPill tone="ember">{upcomingOffDays.length} upcoming</CampfireStatusPill>}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
				<div className="cf:grid cf:gap-3 cf:md:grid-cols-3">
					<CampfireMetric label="Total" value={String(offDays.length)} helper="Workspace off-days" />
					<CampfireMetric label="Upcoming" value={String(upcomingOffDays.length)} helper="Today and later" />
					<CampfireMetric label="Timezone" value={props.workspace.timezone} helper="Date interpretation" />
				</div>

				{message !== '' && <MessageRow state={loadState} message={message} />}
				{loadState === 'loading' && <LoadingRow label="Loading workspace off-days…" />}

				{!props.canManageWorkspace && (
					<MessageRow state="error" message="You can view workspace off-days, but you cannot edit them." />
				)}

				<form
					className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4 cf:lg:grid-cols-[16rem_1fr_auto] cf:lg:items-end"
					onSubmit={handleCreate}
				>
					<FormField label="Date" htmlFor="campfire-workspace-offday-date">
						<Input
							id="campfire-workspace-offday-date"
							type="date"
							disabled={isBusy || !props.canManageWorkspace}
							value={date}
							onChange={event => setDate(event.currentTarget.value)}
						/>
					</FormField>

					<FormField label="Label" htmlFor="campfire-workspace-offday-label">
						<Input
							id="campfire-workspace-offday-label"
							disabled={isBusy || !props.canManageWorkspace}
							placeholder="Company holiday, launch recovery day..."
							value={label}
							onChange={event => setLabel(event.currentTarget.value)}
						/>
					</FormField>

					<Button type="submit" disabled={isBusy || !props.canManageWorkspace}>
						{loadState === 'saving' ? (
							<Loader2 className="cf:size-4 cf:animate-spin" />
						) : (
							<Plus className="cf:size-4" />
						)}
						Add off-day
					</Button>
				</form>

				<Separator className="cf:bg-white/10" />

				{sortedOffDays.length === 0 && loadState !== 'loading' && (
					<CampfireEmpty
						icon={CalendarX2}
						title="No workspace off-days"
						description="Add holidays or skip dates that should suppress standup automation for this workspace."
					/>
				)}

				<div className="cf:grid cf:gap-3">
					{sortedOffDays.map(offDay => (
						<OffDayRow
							key={offDay.id}
							offDay={offDay}
							disabled={isBusy || !props.canManageWorkspace}
							deleting={deletingID === offDay.id}
							onDelete={() => void handleDelete(offDay.id)}
						/>
					))}
				</div>
			</CampfireCardBody>
		</CampfirePanel>
	);
}

/**
 * OffDayRow renders one workspace off-day.
 */
function OffDayRow(props: {
	readonly offDay: WorkspaceOffDay;
	readonly disabled: boolean;
	readonly deleting: boolean;
	readonly onDelete: () => void;
}): ReactElement {
	const isPast = props.offDay.date < getTodayLocalDateString();

	return (
		<article className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:flex cf:flex-col cf:gap-3 cf:sm:flex-row cf:sm:items-start cf:sm:justify-between">
				<div>
					<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
						<strong className="cf:text-lg cf:font-black cf:text-white">{props.offDay.label}</strong>
						<CampfireStatusPill tone={isPast ? 'slate' : 'ember'}>
							{isPast ? 'Past' : 'Upcoming'}
						</CampfireStatusPill>
					</div>

					<p className="cf:mt-2 cf:text-sm cf:font-bold cf:text-slate-300">{props.offDay.date}</p>
					<p className="cf:mt-1 cf:text-xs cf:font-bold cf:text-slate-500">
						Created {formatDateTime(props.offDay.createdAt)}
					</p>
				</div>

				<Button type="button" variant="destructive" disabled={props.disabled} onClick={props.onDelete}>
					{props.deleting ? (
						<Loader2 className="cf:size-4 cf:animate-spin" />
					) : (
						<Trash2 className="cf:size-4" />
					)}
					Delete
				</Button>
			</div>
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
 * formatDateTime formats an API timestamp for compact display.
 */
function formatDateTime(value: string): string {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return date.toLocaleString();
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
