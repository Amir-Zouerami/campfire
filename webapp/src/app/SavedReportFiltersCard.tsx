import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { Bookmark, CheckCircle2, Loader2, Plus, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { ApiClientError, createSavedReportFilter, deleteSavedReportFilter, listSavedReportFilters } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ReportKind, SavedReportFilter, Workspace } from '@/types/domain';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireEmpty,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from './campfire-ui';
import { dispatchApplyReportFilter } from './events';

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
			setLoadState('error');
			setMessage('Saved filter name is required.');
			return;
		}

		const normalizedFilterJson = normalizeFilterJson(draft.filterJson);
		if (normalizedFilterJson === null) {
			setLoadState('error');
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
			toast.success('Saved report filter created');
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);
			setMessage(errorMessage);
			setLoadState('error');
			toast.error(errorMessage);
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
			toast.success('Saved report filter deleted');
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);
			setMessage(errorMessage);
			setLoadState('error');
			toast.error(errorMessage);
		}
	}

	/**
	 * Applies a saved filter to report cards.
	 */
	function handleApply(filter: SavedReportFilter): void {
		dispatchApplyReportFilter({
			workspaceID: props.workspace.id,
			reportType: filter.reportType,
			name: filter.name,
			filterJson: filter.filterJson,
		});

		setMessage(`Applied saved filter "${filter.name}".`);
		toast.success('Saved filter applied');
	}

	return (
		<CampfirePanel className="cf:overflow-hidden">
			<CampfireCardHeader
				eyebrow="Saved filters"
				title="Saved report filters"
				description="Save reusable report filters and apply them to daily, weekly, missing, blockers, or time report views."
				icon={Bookmark}
				action={<CampfireStatusPill tone="ember">{filters.length} saved</CampfireStatusPill>}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
				<div className="cf:grid cf:gap-3 cf:md:grid-cols-3">
					<CampfireMetric
						label="Selected type"
						value={formatLabel(selectedReportType)}
						helper="Filter list"
					/>
					<CampfireMetric label="Saved filters" value={String(filters.length)} helper="Current type" />
					<CampfireMetric label="Workspace" value={props.workspace.name} helper="Filter scope" />
				</div>

				<div className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4 cf:md:grid-cols-[1fr_auto] cf:md:items-end">
					<FormField label="Show filters for" htmlFor="campfire-saved-filter-type">
						<select
							id="campfire-saved-filter-type"
							className={selectClassName()}
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
					</FormField>

					<Button
						type="button"
						variant="secondary"
						disabled={isBusy}
						onClick={() =>
							setDraft(current => ({
								...current,
								reportType: selectedReportType,
							}))
						}
					>
						Use selected type
					</Button>
				</div>

				{message !== '' && <MessageRow state={loadState} message={message} />}
				{loadState === 'loading' && <LoadingRow label="Loading saved filters…" />}

				<form
					className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4"
					onSubmit={handleCreate}
				>
					<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3">
						<h3 className="cf:text-lg cf:font-black cf:text-white">Create saved filter</h3>
						<CampfireStatusPill tone="green">JSON</CampfireStatusPill>
					</div>

					<div className="cf:grid cf:gap-4 cf:lg:grid-cols-[1fr_16rem]">
						<FormField label="Name" htmlFor="campfire-filter-name">
							<Input
								id="campfire-filter-name"
								disabled={isBusy}
								value={draft.name}
								onChange={event =>
									setDraft(current => ({ ...current, name: event.currentTarget.value }))
								}
							/>
						</FormField>

						<FormField label="Report type" htmlFor="campfire-filter-report-type">
							<select
								id="campfire-filter-report-type"
								className={selectClassName()}
								disabled={isBusy}
								value={draft.reportType}
								onChange={event =>
									setDraft(current => ({
										...current,
										reportType: toReportKind(event.currentTarget.value),
									}))
								}
							>
								{reportKindOptions.map(reportKind => (
									<option key={reportKind} value={reportKind}>
										{formatLabel(reportKind)}
									</option>
								))}
							</select>
						</FormField>
					</div>

					<FormField label="Filter JSON" htmlFor="campfire-filter-json">
						<Textarea
							id="campfire-filter-json"
							className="cf:min-h-48 cf:font-mono cf:text-xs"
							disabled={isBusy}
							value={draft.filterJson}
							onChange={event =>
								setDraft(current => ({ ...current, filterJson: event.currentTarget.value }))
							}
						/>
					</FormField>

					<Button type="submit" disabled={isBusy}>
						{loadState === 'saving' ? (
							<Loader2 className="cf:size-4 cf:animate-spin" />
						) : (
							<Plus className="cf:size-4" />
						)}
						Save filter
					</Button>
				</form>

				<Separator className="cf:bg-white/10" />

				{sortedFilters.length === 0 && loadState !== 'loading' && (
					<CampfireEmpty
						icon={Bookmark}
						title="No saved filters"
						description="Create a reusable report filter to quickly apply the same report settings later."
					/>
				)}

				<div className="cf:grid cf:gap-3">
					{sortedFilters.map(filter => (
						<SavedFilterRow
							filter={filter}
							isBusy={isBusy}
							onApply={() => handleApply(filter)}
							onDelete={() => void handleDelete(filter.id)}
							key={filter.id}
						/>
					))}
				</div>
			</CampfireCardBody>
		</CampfirePanel>
	);
}

/**
 * SavedFilterRow renders one saved filter.
 */
function SavedFilterRow(props: {
	readonly filter: SavedReportFilter;
	readonly isBusy: boolean;
	readonly onApply: () => void;
	readonly onDelete: () => void;
}): ReactElement {
	return (
		<article className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:grid cf:gap-4 cf:lg:grid-cols-[1fr_auto] cf:lg:items-start">
				<div>
					<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
						<strong className="cf:text-lg cf:font-black cf:text-white">{props.filter.name}</strong>
						<CampfireStatusPill tone="ember">{formatLabel(props.filter.reportType)}</CampfireStatusPill>
					</div>

					<p className="cf:mt-2 cf:text-xs cf:font-bold cf:text-slate-500">
						Updated {formatDateTime(props.filter.updatedAt)}
					</p>

					<pre className="cf:mt-3 cf:max-h-56 cf:overflow-auto cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/30 cf:p-3 cf:text-xs cf:leading-6 cf:text-slate-300">
						{formatFilterJsonForDisplay(props.filter.filterJson)}
					</pre>
				</div>

				<div className="cf:flex cf:flex-wrap cf:gap-2 cf:lg:justify-end">
					<Button type="button" disabled={props.isBusy} onClick={props.onApply}>
						<Send className="cf:size-4" />
						Apply
					</Button>

					<Button type="button" variant="destructive" disabled={props.isBusy} onClick={props.onDelete}>
						<Trash2 className="cf:size-4" />
						Delete
					</Button>
				</div>
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
 * MessageRow renders save/delete feedback.
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
 * normalizeFilterJson validates and normalizes filter JSON.
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
 * formatFilterJsonForDisplay formats saved filter JSON for display.
 */
function formatFilterJsonForDisplay(value: string): string {
	const normalized = normalizeFilterJson(value);

	return normalized ?? value;
}

/**
 * toReportKind normalizes select values.
 */
function toReportKind(value: string): ReportKind {
	if (value === 'weekly' || value === 'blockers' || value === 'missing' || value === 'time') {
		return value;
	}

	return 'daily';
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
 * formatLabel converts enum-like values to readable labels.
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

	return 'Could not update saved report filters.';
}
