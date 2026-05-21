import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { Activity, FileClock, Loader2, Search } from 'lucide-react';

import { ApiClientError, listAuditLog } from '@/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { AuditLogEntry, Workspace } from '@/types/domain';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireEmpty,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from './campfire-ui';
import { useUserProfiles } from './useUserProfiles';

/**
 * AuditLogCardProps contains the current workspace.
 */
type AuditLogCardProps = {
	readonly workspace: Workspace;
};

/**
 * LoadState describes audit-log panel state.
 */
type LoadState = 'idle' | 'loading' | 'ready' | 'error';

const auditLimitOptions = [25, 50, 100, 200] as const;

/**
 * AuditLogCard renders recent audited product actions for a workspace.
 */
export function AuditLogCard(props: AuditLogCardProps): ReactElement {
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [limit, setLimit] = useState(50);
	const [entries, setEntries] = useState<readonly AuditLogEntry[]>([]);
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * Loads recent audit entries.
		 */
		async function loadAuditLog(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const response = await listAuditLog(props.workspace.id, limit);

				if (!isActive) {
					return;
				}

				setEntries(response.entries);
				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setMessage(errorToMessage(error));
				setLoadState('error');
			}
		}

		void loadAuditLog();

		return () => {
			isActive = false;
		};
	}, [props.workspace.id, limit]);

	const actorUserIDs = useMemo(() => {
		return uniqueStrings(entries.map(entry => entry.actorUserId));
	}, [entries]);

	const {
		errorMessage: profileErrorMessage,
		labelForUserID,
		loading: profilesLoading,
	} = useUserProfiles(actorUserIDs);

	const actionCounts = useMemo(() => countEntriesByAction(entries), [entries]);

	/**
	 * Reloads audit entries with the current limit.
	 */
	async function handleReload(): Promise<void> {
		setLoadState('loading');
		setMessage('');

		try {
			const response = await listAuditLog(props.workspace.id, limit);
			setEntries(response.entries);
			setLoadState('ready');
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	return (
		<CampfirePanel className="cf:overflow-hidden">
			<CampfireCardHeader
				eyebrow="Audit"
				title="Audit log"
				description="Recent important actions for this workspace. Audit logging should support local testing and later production troubleshooting."
				icon={FileClock}
				action={<CampfireStatusPill tone="green">{entries.length} entries</CampfireStatusPill>}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
				<div className="cf:grid cf:gap-3 cf:md:grid-cols-4">
					<CampfireMetric label="Entries" value={String(entries.length)} helper={`Limit ${limit}`} />
					<CampfireMetric label="Actions" value={String(actionCounts.length)} helper="Unique action names" />
					<CampfireMetric label="Actors" value={String(actorUserIDs.length)} helper="Unique users" />
					<CampfireMetric label="Workspace" value={props.workspace.name} helper="Current scope" />
				</div>

				<div className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4 cf:md:grid-cols-[1fr_auto] cf:md:items-end">
					<FormField label="Limit" htmlFor="campfire-audit-limit">
						<select
							id="campfire-audit-limit"
							className={selectClassName()}
							disabled={loadState === 'loading'}
							value={limit}
							onChange={event => setLimit(toAuditLimit(event.currentTarget.value))}
						>
							{auditLimitOptions.map(option => (
								<option key={option} value={option}>
									{option} entries
								</option>
							))}
						</select>
					</FormField>

					<Button type="button" disabled={loadState === 'loading'} onClick={() => void handleReload()}>
						{loadState === 'loading' ? (
							<Loader2 className="cf:size-4 cf:animate-spin" />
						) : (
							<Search className="cf:size-4" />
						)}
						Reload
					</Button>
				</div>

				{message !== '' && <MessageRow state={loadState} message={message} />}
				{profileErrorMessage !== '' && <MessageRow state="error" message={profileErrorMessage} />}
				{profilesLoading && <LoadingRow label="Resolving actor names…" />}
				{loadState === 'loading' && <LoadingRow label="Loading audit log…" />}

				{actionCounts.length > 0 && (
					<div className="cf:flex cf:flex-wrap cf:gap-2">
						{actionCounts.map(row => (
							<Badge key={row.action} variant="secondary" className="cf:rounded-full">
								{formatLabel(row.action)}: {row.count}
							</Badge>
						))}
					</div>
				)}

				<Separator className="cf:bg-white/10" />

				{entries.length === 0 && loadState !== 'loading' && (
					<CampfireEmpty
						icon={Activity}
						title="No audit entries"
						description="Important workspace actions will appear here after they are recorded."
					/>
				)}

				<div className="cf:grid cf:gap-3">
					{entries.map(entry => (
						<AuditEntryRow key={entry.id} entry={entry} actorLabel={labelForUserID(entry.actorUserId)} />
					))}
				</div>
			</CampfireCardBody>
		</CampfirePanel>
	);
}

/**
 * AuditEntryRow renders one audit entry.
 */
function AuditEntryRow(props: { readonly entry: AuditLogEntry; readonly actorLabel: string }): ReactElement {
	const metadataRows = Object.entries(props.entry.metadata);

	return (
		<article className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:flex cf:flex-col cf:gap-3 cf:lg:flex-row cf:lg:items-start cf:lg:justify-between">
				<div>
					<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
						<strong className="cf:text-lg cf:font-black cf:text-white">
							{formatLabel(props.entry.action)}
						</strong>
						<CampfireStatusPill tone="ember">{formatLabel(props.entry.entityType)}</CampfireStatusPill>
					</div>

					<p className="cf:mt-2 cf:text-sm cf:font-medium cf:text-slate-400">
						Actor:{' '}
						<span className="cf:font-black cf:text-slate-200" title={props.entry.actorUserId}>
							{props.actorLabel}
						</span>
					</p>

					<p className="cf:mt-1 cf:text-xs cf:font-bold cf:text-slate-500">
						Entity {props.entry.entityId || 'none'} · {formatDateTime(props.entry.createdAt)}
					</p>
				</div>

				<div className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:px-3 cf:py-2 cf:text-xs cf:font-bold cf:text-slate-300">
					{props.entry.id}
				</div>
			</div>

			{metadataRows.length > 0 && (
				<div className="cf:mt-4 cf:grid cf:gap-2 cf:sm:grid-cols-2">
					{metadataRows.map(([key, value]) => (
						<div key={key} className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-3">
							<span className="cf:block cf:text-xs cf:font-black cf:uppercase cf:tracking-widest cf:text-amber-200">
								{formatLabel(key)}
							</span>
							<strong className="cf:mt-1 cf:block cf:wrap-break-word cf:text-sm cf:font-bold cf:text-white">
								{value}
							</strong>
						</div>
					))}
				</div>
			)}
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
 * MessageRow renders load feedback.
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
 * countEntriesByAction returns audit counts grouped by action.
 */
function countEntriesByAction(
	entries: readonly AuditLogEntry[],
): readonly { readonly action: string; readonly count: number }[] {
	const counts: Record<string, number> = {};

	for (const entry of entries) {
		counts[entry.action] = (counts[entry.action] ?? 0) + 1;
	}

	return Object.entries(counts)
		.map(([action, count]) => ({ action, count }))
		.sort((first, second) => second.count - first.count || first.action.localeCompare(second.action));
}

/**
 * uniqueStrings returns unique non-empty strings.
 */
function uniqueStrings(values: readonly string[]): readonly string[] {
	return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

/**
 * toAuditLimit normalizes select values.
 */
function toAuditLimit(value: string): number {
	const parsed = Number.parseInt(value, 10);

	if (auditLimitOptions.some(option => option === parsed)) {
		return parsed;
	}

	return 50;
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
		.split(/[_:. -]+/)
		.filter(Boolean)
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

	return 'Could not load audit log.';
}
