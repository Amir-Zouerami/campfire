import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from 'react';

import {
	ApiClientError,
	createSavedReportFilter,
	deleteSavedReportFilter,
	listSavedReportFilters,
} from '../api/client';
import { dispatchApplyReportFilter } from './events';
import type { ReportKind, SavedReportFilter, Workspace } from '../types/domain';

/**
 * SavedReportFiltersCardProps contains the current workspace.
 */
type SavedReportFiltersCardProps = {
	readonly workspace: Workspace;
};

/**
 * LoadState describes the saved-filter card loading state.
 */
type LoadState = 'idle' | 'loading' | 'ready' | 'saving' | 'deleting' | 'error';

/**
 * ReportFilterDraft contains editable saved-filter form values.
 */
type ReportFilterDraft = {
	readonly name: string;
	readonly reportType: ReportKind;
	readonly filterJson: string;
};

const reportKindOptions: readonly ReportKind[] = ['daily', 'weekly', 'blockers', 'missing', 'time'];

const defaultFilterJson = `{
  "sortMode": "first_submitted",
  "includeMissing": true,
  "includeOnLeave": true,
  "includeTime": false,
  "includeBlockers": true
}`;

/**
 * SavedReportFiltersCard lets users save reusable workspace report filters.
 */
export function SavedReportFiltersCard(props: SavedReportFiltersCardProps): ReactElement {
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [selectedReportType, setSelectedReportType] = useState<ReportKind>('daily');
	const [filters, setFilters] = useState<readonly SavedReportFilter[]>([]);
	const [draft, setDraft] = useState<ReportFilterDraft>({
		name: '',
		reportType: 'daily',
		filterJson: defaultFilterJson,
	});
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * Loads saved filters for the selected report type.
		 */
		async function loadFilters(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const response = await listSavedReportFilters(props.workspace.id, selectedReportType);

				if (!isActive) {
					return;
				}

				setFilters(response.filters);
				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setMessage(errorToMessage(error));
				setLoadState('error');
			}
		}

		void loadFilters();

		return () => {
			isActive = false;
		};
	}, [props.workspace.id, selectedReportType]);

	const sortedFilters = useMemo(() => {
		return [...filters].sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
	}, [filters]);

	const isBusy = loadState === 'loading' || loadState === 'saving' || loadState === 'deleting';

	/**
	 * Creates a saved report filter from the draft.
	 */
	async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();

		const cleanName = draft.name.trim();
		if (cleanName === '') {
			setMessage('Saved filter name is required.');
			return;
		}

		const normalizedFilterJson = normalizeFilterJson(draft.filterJson);
		if (normalizedFilterJson === null) {
			setMessage('Filter JSON must be valid JSON.');
			return;
		}

		setLoadState('saving');
		setMessage('');

		try {
			const response = await createSavedReportFilter(props.workspace.id, {
				name: cleanName,
				scope: 'workspace',
				reportType: draft.reportType,
				filterJson: normalizedFilterJson,
			});

			setFilters(current => [response.filter, ...current]);
			setSelectedReportType(response.filter.reportType);
			setDraft(current => ({
				...current,
				name: '',
				filterJson: normalizedFilterJson,
			}));
			setLoadState('ready');
			setMessage('Saved report filter created.');
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	/**
	 * Deletes one saved report filter.
	 */
	async function handleDelete(filterID: string): Promise<void> {
		setLoadState('deleting');
		setMessage('');

		try {
			await deleteSavedReportFilter(props.workspace.id, filterID);

			setFilters(current => current.filter(filter => filter.id !== filterID));
			setLoadState('ready');
			setMessage('Saved report filter deleted.');
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	/**
	 * Loads an existing filter into the editor.
	 */
	function handleLoadIntoEditor(filter: SavedReportFilter): void {
		setDraft({
			name: filter.name,
			reportType: filter.reportType,
			filterJson: formatFilterJsonForEditing(filter.filterJson),
		});
		setSelectedReportType(filter.reportType);
		setMessage('Filter loaded into editor. Save it as a new filter after editing.');
	}

	/**
	 * Applies a saved filter to the matching report cards.
	 */
	function handleApplyFilter(filter: SavedReportFilter): void {
		const normalizedFilterJson = normalizeFilterJson(filter.filterJson);
		if (normalizedFilterJson === null) {
			setMessage('This saved filter contains invalid JSON and cannot be applied.');
			return;
		}

		dispatchApplyReportFilter({
			workspaceID: props.workspace.id,
			reportType: filter.reportType,
			name: filter.name,
			filterJson: normalizedFilterJson,
		});

		setMessage(`Applied saved filter "${filter.name}" to ${formatLabel(filter.reportType)} report controls.`);
	}

	return (
		<section className="cf:mt-5 cf:rounded-3xl cf:border cf:border-indigo-300/20 cf:bg-white/[0.055] cf:p-6 cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
			<div className="cf:grid cf:gap-5 cf:lg:grid-cols-[1fr_auto] cf:lg:items-start">
				<div>
					<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-indigo-200">
						Saved filters
					</p>
					<h2 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
						Workspace report filters
					</h2>
					<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">
						Save reusable report filter JSON for daily, weekly, blockers, missing, and time reports. Filters
						are currently workspace-scoped and owned by the current user.
					</p>
				</div>

				<div className="cf:w-fit cf:rounded-full cf:border cf:border-indigo-300/25 cf:bg-indigo-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-indigo-200">
					{filters.length} saved
				</div>
			</div>

			{message !== '' && <p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{message}</p>}

			<form
				className="cf:mt-5 cf:grid cf:gap-4 cf:lg:grid-cols-[1fr_220px] cf:lg:items-start"
				onSubmit={event => void handleCreate(event)}
			>
				<div className="cf:grid cf:gap-3">
					<div className="cf:grid cf:gap-3 cf:md:grid-cols-[1fr_220px]">
						<Field label="Filter name">
							<input
								className={inputClassName}
								disabled={isBusy}
								placeholder="Example: Daily report with blockers first"
								type="text"
								value={draft.name}
								onChange={event =>
									setDraft(current => ({ ...current, name: event.currentTarget.value }))
								}
							/>
						</Field>

						<Field label="Report type">
							<select
								className={inputClassName}
								disabled={isBusy}
								value={draft.reportType}
								onChange={event => {
									const reportType = toReportKind(event.currentTarget.value);
									setDraft(current => ({ ...current, reportType }));
									setSelectedReportType(reportType);
								}}
							>
								{reportKindOptions.map(reportKind => (
									<option key={reportKind} value={reportKind}>
										{formatLabel(reportKind)}
									</option>
								))}
							</select>
						</Field>
					</div>

					<Field label="Filter JSON">
						<textarea
							className="cf:min-h-52 cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/55 cf:px-4 cf:py-3 cf:font-mono cf:text-sm cf:leading-6 cf:text-white cf:outline-none cf:transition cf:placeholder:text-slate-500 cf:focus:border-indigo-300/60 cf:focus:ring-4 cf:focus:ring-indigo-300/15"
							disabled={isBusy}
							spellCheck={false}
							value={draft.filterJson}
							onChange={event =>
								setDraft(current => ({ ...current, filterJson: event.currentTarget.value }))
							}
						/>
					</Field>
				</div>

				<div className="cf:grid cf:gap-3">
					<button
						className="cf:rounded-2xl cf:border cf:border-indigo-300/30 cf:bg-indigo-400/20 cf:px-5 cf:py-3 cf:font-black cf:text-indigo-50 cf:transition cf:hover:bg-indigo-400/30 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
						disabled={isBusy}
						type="submit"
					>
						{loadState === 'saving' ? 'Saving…' : 'Save filter'}
					</button>

					<button
						className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.06] cf:px-5 cf:py-3 cf:font-black cf:text-white cf:transition cf:hover:bg-white/[0.1] cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
						disabled={isBusy}
						type="button"
						onClick={() => setDraft(current => ({ ...current, filterJson: defaultFilterJson }))}
					>
						Reset JSON
					</button>
				</div>
			</form>

			<div className="cf:mt-5 cf:grid cf:gap-3 cf:md:grid-cols-[220px_1fr] cf:md:items-end">
				<Field label="Show saved filters for">
					<select
						className={inputClassName}
						disabled={isBusy}
						value={selectedReportType}
						onChange={event => setSelectedReportType(toReportKind(event.currentTarget.value))}
					>
						{reportKindOptions.map(reportKind => (
							<option key={reportKind} value={reportKind}>
								{formatLabel(reportKind)}
							</option>
						))}
					</select>
				</Field>

				{loadState === 'loading' && (
					<p className="cf:m-0 cf:text-sm cf:text-slate-300">Loading saved filters…</p>
				)}
			</div>

			<div className="cf:mt-4 cf:grid cf:gap-3">
				{loadState !== 'loading' && sortedFilters.length === 0 && (
					<p className="cf:m-0 cf:rounded-2xl cf:border cf:border-dashed cf:border-white/10 cf:p-4 cf:text-slate-300">
						No saved filters for {formatLabel(selectedReportType)} reports yet.
					</p>
				)}

				{sortedFilters.map(filter => (
					<article
						className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4"
						key={filter.id}
					>
						<div className="cf:grid cf:gap-3 cf:lg:grid-cols-[1fr_auto] cf:lg:items-start">
							<div>
								<strong className="cf:block cf:text-lg cf:font-black cf:text-white">
									{filter.name}
								</strong>
								<p className="cf:m-0 cf:mt-1 cf:text-xs cf:font-bold cf:text-slate-400">
									{formatLabel(filter.reportType)} · Updated {formatDateTime(filter.updatedAt)}
								</p>
							</div>

							<div className="cf:flex cf:flex-wrap cf:gap-2">
								<button
									className="cf:rounded-2xl cf:border cf:border-indigo-300/25 cf:bg-indigo-400/15 cf:px-4 cf:py-2 cf:text-sm cf:font-black cf:text-indigo-50 cf:transition cf:hover:bg-indigo-400/25 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
									disabled={isBusy}
									type="button"
									onClick={() => handleApplyFilter(filter)}
								>
									Apply
								</button>

								<button
									className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.06] cf:px-4 cf:py-2 cf:text-sm cf:font-black cf:text-white cf:transition cf:hover:bg-white/[0.1] cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
									disabled={isBusy}
									type="button"
									onClick={() => handleLoadIntoEditor(filter)}
								>
									Load
								</button>

								<button
									className="cf:rounded-2xl cf:border cf:border-red-300/25 cf:bg-red-400/15 cf:px-4 cf:py-2 cf:text-sm cf:font-black cf:text-red-50 cf:transition cf:hover:bg-red-400/25 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
									disabled={isBusy}
									type="button"
									onClick={() => void handleDelete(filter.id)}
								>
									Delete
								</button>
							</div>
						</div>

						<pre className="cf:mt-3 cf:max-h-64 cf:overflow-auto cf:whitespace-pre-wrap cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-3 cf:font-mono cf:text-xs cf:leading-5 cf:text-slate-200">
							{formatFilterJsonForEditing(filter.filterJson)}
						</pre>
					</article>
				))}
			</div>
		</section>
	);
}

const inputClassName =
	'cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/55 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:transition cf:[color-scheme:dark] cf:placeholder:text-slate-500 cf:focus:border-indigo-300/60 cf:focus:ring-4 cf:focus:ring-indigo-300/15';

/**
 * Field renders a labeled control.
 */
function Field(props: { readonly label: string; readonly children: ReactElement }): ReactElement {
	return (
		<label className="cf:grid cf:gap-2">
			<span className="cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.14em] cf:text-indigo-200">
				{props.label}
			</span>
			{props.children}
		</label>
	);
}

/**
 * normalizeFilterJson validates and pretty-prints filter JSON.
 */
function normalizeFilterJson(value: string): string | null {
	try {
		const parsed: unknown = JSON.parse(value);

		return JSON.stringify(parsed, null, 2);
	} catch (_error: unknown) {
		return null;
	}
}

/**
 * formatFilterJsonForEditing returns pretty JSON when possible.
 */
function formatFilterJsonForEditing(value: string): string {
	return normalizeFilterJson(value) ?? value;
}

/**
 * toReportKind narrows a string to a supported report kind.
 */
function toReportKind(value: string): ReportKind {
	switch (value) {
		case 'daily':
		case 'weekly':
		case 'blockers':
		case 'missing':
		case 'time':
			return value;

		default:
			return 'daily';
	}
}

/**
 * formatLabel converts enum-like values to readable labels.
 */
function formatLabel(value: string): string {
	return value
		.split('_')
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
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

	return 'Could not update saved report filters.';
}
