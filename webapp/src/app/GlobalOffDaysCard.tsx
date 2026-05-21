import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { CalendarX2, CheckCircle2, Globe2, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { ApiClientError, createGlobalSkipDate, deleteGlobalSkipDate, listGlobalSkipDates } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { GlobalSkipDate } from '@/types/domain';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireEmpty,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from './campfire-ui';

/**
 * GlobalOffDaysCardProps contains the current user's global settings capability.
 */
type GlobalOffDaysCardProps = {
	readonly isSystemAdmin: boolean;
};

/**
 * LoadState describes the global off-days card state.
 */
type LoadState = 'idle' | 'loading' | 'ready' | 'saving' | 'deleting' | 'error';

/**
 * GlobalOffDaysCard lets system admins manage global no-standup dates.
 */
export function GlobalOffDaysCard(props: GlobalOffDaysCardProps): ReactElement {
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [skipDates, setSkipDates] = useState<readonly GlobalSkipDate[]>([]);
	const [date, setDate] = useState('');
	const [label, setLabel] = useState('');
	const [deletingID, setDeletingID] = useState('');
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * Loads global Campfire skip dates.
		 */
		async function loadSkipDates(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const response = await listGlobalSkipDates();

				if (!isActive) {
					return;
				}

				setSkipDates(response.skipDates);
				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setMessage(errorToMessage(error));
				setLoadState('error');
			}
		}

		void loadSkipDates();

		return () => {
			isActive = false;
		};
	}, []);

	const sortedSkipDates = useMemo(() => sortSkipDates(skipDates), [skipDates]);
	const upcomingSkipDates = useMemo(
		() => sortedSkipDates.filter(skipDate => skipDate.date >= getTodayLocalDateString()),
		[sortedSkipDates],
	);
	const isBusy = loadState === 'loading' || loadState === 'saving' || loadState === 'deleting';

	/**
	 * Creates a new global skip date.
	 */
	async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();

		if (!props.isSystemAdmin) {
			setLoadState('error');
			setMessage('Only system admins can manage global off-days.');
			return;
		}

		const cleanDate = date.trim();
		const cleanLabel = label.trim();

		if (cleanDate === '') {
			setLoadState('error');
			setMessage('Choose a global off-day date.');
			return;
		}

		if (cleanLabel === '') {
			setLoadState('error');
			setMessage('Global off-day label is required.');
			return;
		}

		setLoadState('saving');
		setMessage('');

		try {
			const response = await createGlobalSkipDate({
				date: cleanDate,
				label: cleanLabel,
			});

			setSkipDates(current => [response.skipDate, ...current]);
			setDate('');
			setLabel('');
			setLoadState('ready');
			setMessage('Global off-day created.');
			toast.success('Global off-day created');
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);
			setMessage(errorMessage);
			setLoadState('error');
			toast.error(errorMessage);
		}
	}

	/**
	 * Deletes a global skip date.
	 */
	async function handleDelete(skipDateID: string): Promise<void> {
		if (!props.isSystemAdmin) {
			setLoadState('error');
			setMessage('Only system admins can manage global off-days.');
			return;
		}

		setLoadState('deleting');
		setDeletingID(skipDateID);
		setMessage('');

		try {
			await deleteGlobalSkipDate(skipDateID);

			setSkipDates(current => current.filter(skipDate => skipDate.id !== skipDateID));
			setLoadState('ready');
			setDeletingID('');
			setMessage('Global off-day deleted.');
			toast.success('Global off-day deleted');
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
				eyebrow="Global calendar"
				title="Global off-days"
				description="System-wide no-standup dates. These are checked before workspace-specific calendars."
				icon={Globe2}
				action={
					<CampfireStatusPill tone={props.isSystemAdmin ? 'green' : 'slate'}>
						{props.isSystemAdmin ? 'System admin' : 'Read only'}
					</CampfireStatusPill>
				}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
				<div className="cf:grid cf:gap-3 cf:md:grid-cols-3">
					<CampfireMetric label="Total" value={String(skipDates.length)} helper="Global off-days" />
					<CampfireMetric
						label="Upcoming"
						value={String(upcomingSkipDates.length)}
						helper="Today and later"
					/>
					<CampfireMetric
						label="Access"
						value={props.isSystemAdmin ? 'Manage' : 'View'}
						helper="Current user"
					/>
				</div>

				{message !== '' && <MessageRow state={loadState} message={message} />}
				{loadState === 'loading' && <LoadingRow label="Loading global off-days…" />}

				{!props.isSystemAdmin && (
					<MessageRow
						state="error"
						message="You can view global off-days, but only system admins can edit them."
					/>
				)}

				<form
					className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4 cf:lg:grid-cols-[16rem_1fr_auto] cf:lg:items-end"
					onSubmit={handleCreate}
				>
					<FormField label="Date" htmlFor="campfire-global-offday-date">
						<Input
							id="campfire-global-offday-date"
							type="date"
							disabled={isBusy || !props.isSystemAdmin}
							value={date}
							onChange={event => setDate(event.currentTarget.value)}
						/>
					</FormField>

					<FormField label="Label" htmlFor="campfire-global-offday-label">
						<Input
							id="campfire-global-offday-label"
							disabled={isBusy || !props.isSystemAdmin}
							placeholder="Company holiday, global shutdown..."
							value={label}
							onChange={event => setLabel(event.currentTarget.value)}
						/>
					</FormField>

					<Button type="submit" disabled={isBusy || !props.isSystemAdmin}>
						{loadState === 'saving' ? (
							<Loader2 className="cf:size-4 cf:animate-spin" />
						) : (
							<Plus className="cf:size-4" />
						)}
						Add off-day
					</Button>
				</form>

				<Separator className="cf:bg-white/10" />

				{sortedSkipDates.length === 0 && loadState !== 'loading' && (
					<CampfireEmpty
						icon={CalendarX2}
						title="No global off-days"
						description="Global holidays and shutdown days will appear here."
					/>
				)}

				<div className="cf:grid cf:gap-3">
					{sortedSkipDates.map(skipDate => (
						<GlobalOffDayRow
							key={skipDate.id}
							skipDate={skipDate}
							disabled={isBusy || !props.isSystemAdmin}
							deleting={deletingID === skipDate.id}
							onDelete={() => void handleDelete(skipDate.id)}
						/>
					))}
				</div>
			</CampfireCardBody>
		</CampfirePanel>
	);
}

/**
 * GlobalOffDayRow renders one global off-day.
 */
function GlobalOffDayRow(props: {
	readonly skipDate: GlobalSkipDate;
	readonly disabled: boolean;
	readonly deleting: boolean;
	readonly onDelete: () => void;
}): ReactElement {
	const isPast = props.skipDate.date < getTodayLocalDateString();

	return (
		<article className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:flex cf:flex-col cf:gap-3 cf:sm:flex-row cf:sm:items-start cf:sm:justify-between">
				<div>
					<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
						<strong className="cf:text-lg cf:font-black cf:text-white">{props.skipDate.label}</strong>
						<CampfireStatusPill tone={isPast ? 'slate' : 'ember'}>
							{isPast ? 'Past' : 'Upcoming'}
						</CampfireStatusPill>
					</div>

					<p className="cf:mt-2 cf:text-sm cf:font-bold cf:text-slate-300">{props.skipDate.date}</p>
					<p className="cf:mt-1 cf:text-xs cf:font-bold cf:text-slate-500">
						Created {formatDateTime(props.skipDate.createdAt)}
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
 * MessageRow renders loading/error feedback.
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
			{!isError && <CheckCircle2 className="cf:mr-2 cf:inline cf:size-4" />}
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
 * sortSkipDates returns skip dates ordered by date.
 */
function sortSkipDates(skipDates: readonly GlobalSkipDate[]): readonly GlobalSkipDate[] {
	return [...skipDates].sort((first, second) => {
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

	return 'Could not update global off-days.';
}
