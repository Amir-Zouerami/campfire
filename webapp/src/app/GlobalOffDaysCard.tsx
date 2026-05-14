import { useEffect, useState, type FormEvent, type ReactElement } from 'react';

import { ApiClientError, createGlobalSkipDate, deleteGlobalSkipDate, listGlobalSkipDates } from '../api/client';
import type { GlobalSkipDate } from '../types/domain';

const globalOffDayDateInputID = 'campfire-global-offday-date';
const globalOffDayLabelInputID = 'campfire-global-offday-label';

/**
 * GlobalOffDaysCardProps contains the current user's global settings capability.
 */
type GlobalOffDaysCardProps = {
	readonly isSystemAdmin: boolean;
};

/**
 * LoadState describes the global off-days card loading status.
 */
type LoadState = 'idle' | 'loading' | 'ready' | 'saving' | 'deleting' | 'error';

/**
 * GlobalOffDaysCard lets system admins manage organization-wide Campfire off-days.
 *
 * Global off-days suppress standup automation across all workspaces and block
 * leave requests for those dates.
 */
export function GlobalOffDaysCard(props: GlobalOffDaysCardProps): ReactElement {
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [skipDates, setSkipDates] = useState<readonly GlobalSkipDate[]>([]);
	const [date, setDate] = useState('');
	const [label, setLabel] = useState('');
	const [message, setMessage] = useState('');

	useEffect(() => {
		if (!props.isSystemAdmin) {
			return;
		}

		let isActive = true;

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
	}, [props.isSystemAdmin]);

	if (!props.isSystemAdmin) {
		return (
			<section className="mt-5 rounded-3xl border border-white/10 bg-white/4 p-6">
				<p className="m-0 text-xs font-extrabold uppercase tracking-[0.18em] text-amber-300">Global settings</p>
				<h2 className="m-0 mt-2 text-2xl font-black tracking-[-0.04em] text-white">Global off-days</h2>
				<p className="m-0 mt-2 max-w-3xl leading-7 text-slate-300">
					Global holiday and off-day settings are available to Mattermost system admins.
				</p>
			</section>
		);
	}

	/**
	 * Creates a global off-day from the form.
	 */
	async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();

		const cleanDate = date.trim();
		const cleanLabel = label.trim();

		if (cleanDate === '' || cleanLabel === '') {
			setMessage('Choose a date and enter a label.');
			return;
		}

		setLoadState('saving');
		setMessage('');

		try {
			const response = await createGlobalSkipDate({
				date: cleanDate,
				label: cleanLabel,
			});

			setSkipDates(current => sortSkipDates([...current, response.skipDate]));
			setDate('');
			setLabel('');
			setLoadState('ready');
			setMessage('Global off-day added.');
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	/**
	 * Deletes a global off-day.
	 */
	async function handleDelete(skipDateID: string): Promise<void> {
		setLoadState('deleting');
		setMessage('');

		try {
			await deleteGlobalSkipDate(skipDateID);

			setSkipDates(current => current.filter(skipDate => skipDate.id !== skipDateID));
			setLoadState('ready');
			setMessage('Global off-day removed.');
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	const isBusy = loadState === 'loading' || loadState === 'saving' || loadState === 'deleting';

	return (
		<section className="mt-5 rounded-3xl border border-orange-400/20 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.12),transparent_34%)] bg-white/5.5 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
			<div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-start">
				<div>
					<p className="m-0 text-xs font-extrabold uppercase tracking-[0.18em] text-amber-300">
						Global settings
					</p>
					<h2 className="m-0 mt-2 text-2xl font-black tracking-[-0.04em] text-white">Global off-days</h2>
					<p className="m-0 mt-2 max-w-3xl leading-7 text-slate-300">
						Declare organization-wide holidays or off-days. Campfire will skip standups, suppress reminders,
						and prevent leave requests on these dates.
					</p>
				</div>

				<div className="w-fit rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-amber-300">
					Admin
				</div>
			</div>

			<form className="mt-6 grid gap-3 lg:grid-cols-[180px_1fr_auto] lg:items-end" onSubmit={handleCreate}>
				<div className="grid gap-2">
					<label
						className="text-xs font-extrabold uppercase tracking-[0.14em] text-amber-300"
						htmlFor={globalOffDayDateInputID}
					>
						Date
					</label>
					<input
						className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-white scheme-dark outline-none transition placeholder:text-slate-500 focus:border-orange-400/60 focus:ring-4 focus:ring-orange-400/15"
						id={globalOffDayDateInputID}
						type="date"
						value={date}
						onChange={event => setDate(event.currentTarget.value)}
						disabled={isBusy}
					/>
				</div>

				<div className="grid gap-2">
					<label
						className="text-xs font-extrabold uppercase tracking-[0.14em] text-amber-300"
						htmlFor={globalOffDayLabelInputID}
					>
						Label
					</label>
					<input
						className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-orange-400/60 focus:ring-4 focus:ring-orange-400/15"
						id={globalOffDayLabelInputID}
						type="text"
						value={label}
						placeholder="Company holiday, shutdown day..."
						onChange={event => setLabel(event.currentTarget.value)}
						disabled={isBusy}
					/>
				</div>

				<button
					className="rounded-2xl border border-orange-300/25 bg-linear-to-br from-orange-500 to-amber-300 px-5 py-3 font-black text-slate-950 shadow-[0_18px_50px_rgba(249,115,22,0.18)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
					type="submit"
					disabled={isBusy}
				>
					Add off-day
				</button>
			</form>

			{message !== '' && <p className="m-0 mt-4 text-sm font-bold text-amber-300">{message}</p>}

			<div className="mt-5 grid gap-3">
				{loadState === 'loading' && <p className="m-0 text-slate-300">Loading global off-days…</p>}

				{loadState !== 'loading' && skipDates.length === 0 && (
					<p className="m-0 text-slate-300">No global off-days configured yet.</p>
				)}

				{skipDates.map(skipDate => (
					<article
						className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/40 p-4 sm:flex-row sm:items-center sm:justify-between"
						key={skipDate.id}
					>
						<div>
							<strong className="block text-base font-black text-white">{skipDate.label}</strong>
							<span className="mt-1 block text-sm text-slate-300">{skipDate.date}</span>
						</div>

						<button
							className="w-fit rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:border-red-300/30 hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-60"
							type="button"
							onClick={() => void handleDelete(skipDate.id)}
							disabled={isBusy}
						>
							Remove
						</button>
					</article>
				))}
			</div>
		</section>
	);
}

/**
 * sortSkipDates returns skip dates ordered by date.
 */
function sortSkipDates(skipDates: readonly GlobalSkipDate[]): readonly GlobalSkipDate[] {
	return [...skipDates].sort((first, second) => first.date.localeCompare(second.date));
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
