import { useEffect, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';

import { ApiClientError, createGlobalSkipDate, deleteGlobalSkipDate, listGlobalSkipDates } from '../api/client';
import type { GlobalSkipDate } from '../types/domain';

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
			<section className="campfire-admin-card campfire-admin-card-muted">
				<div>
					<p className="campfire-eyebrow">Global settings</p>
					<h2>Global off-days</h2>
					<p>Global holiday and off-day settings are available to Mattermost system admins.</p>
				</div>
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
		<section className="campfire-admin-card">
			<div className="campfire-admin-card-header">
				<div>
					<p className="campfire-eyebrow">Global settings</p>
					<h2>Global off-days</h2>
					<p>
						Declare organization-wide holidays or off-days. Campfire will skip standups, suppress reminders,
						and prevent leave requests on these dates.
					</p>
				</div>

				<div className="campfire-admin-badge">Admin</div>
			</div>

			<form className="campfire-offday-form" onSubmit={handleCreate}>
				<label>
					<span>Date</span>
					<input
						type="date"
						value={date}
						onChange={event => setDate(event.currentTarget.value)}
						disabled={isBusy}
					/>
				</label>

				<label>
					<span>Label</span>
					<input
						type="text"
						value={label}
						placeholder="Company holiday, shutdown day..."
						onChange={event => setLabel(event.currentTarget.value)}
						disabled={isBusy}
					/>
				</label>

				<button type="submit" disabled={isBusy}>
					Add off-day
				</button>
			</form>

			{message !== '' && <p className="campfire-inline-message">{message}</p>}

			<div className="campfire-offday-list">
				{loadState === 'loading' && <p className="campfire-muted">Loading global off-days…</p>}

				{loadState !== 'loading' && skipDates.length === 0 && (
					<p className="campfire-muted">No global off-days configured yet.</p>
				)}

				{skipDates.map(skipDate => (
					<article className="campfire-offday-row" key={skipDate.id}>
						<div>
							<strong>{skipDate.label}</strong>
							<span>{skipDate.date}</span>
						</div>

						<button type="button" onClick={() => void handleDelete(skipDate.id)} disabled={isBusy}>
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
