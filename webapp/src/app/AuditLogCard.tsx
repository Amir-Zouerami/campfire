import { useEffect, useMemo, useState, type ReactElement } from 'react';

import { useUserProfiles } from './useUserProfiles';
import { ApiClientError, listAuditLog } from '../api/client';
import type { AuditLogEntry, Workspace } from '../types/domain';

/**
 * AuditLogCardProps contains workspace audit-log inputs.
 */
type AuditLogCardProps = {
	readonly workspace: Workspace;
};

/**
 * LoadState describes audit-log loading state.
 */
type LoadState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * AuditLogCard renders recent important actions in a workspace.
 */
export function AuditLogCard(props: AuditLogCardProps): ReactElement {
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [entries, setEntries] = useState<readonly AuditLogEntry[]>([]);
	const [limit, setLimit] = useState(50);
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

	const actorUserIDs = useMemo(() => collectActorUserIDs(entries), [entries]);
	const {
		errorMessage: profileErrorMessage,
		labelForUserID,
		loading: profilesLoading,
	} = useUserProfiles(actorUserIDs);

	return (
		<section className="cf:rounded-3xl cf:border cf:border-slate-300/20 cf:bg-white/[0.055] cf:p-6 cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
			<div className="cf:grid cf:gap-5 cf:lg:grid-cols-[1fr_auto] cf:lg:items-start">
				<div>
					<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-slate-200">
						Audit
					</p>
					<h2 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
						Workspace audit log
					</h2>
					<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">
						Recent important Campfire actions for this workspace.
					</p>
				</div>

				<select
					className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:focus:border-slate-300/45 cf:lg:w-44"
					value={limit}
					onChange={event => setLimit(Number.parseInt(event.currentTarget.value, 10))}
				>
					<option value={25}>Last 25</option>
					<option value={50}>Last 50</option>
					<option value={100}>Last 100</option>
					<option value={200}>Last 200</option>
				</select>
			</div>

			{message !== '' && <p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{message}</p>}
			{profileErrorMessage !== '' && (
				<p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{profileErrorMessage}</p>
			)}
			{profilesLoading && (
				<p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-slate-300">Resolving actor names…</p>
			)}

			<div className="cf:mt-5 cf:grid cf:gap-3">
				{loadState === 'loading' && <p className="cf:m-0 cf:text-slate-300">Loading audit log…</p>}

				{loadState !== 'loading' && entries.length === 0 && (
					<p className="cf:m-0 cf:rounded-2xl cf:border cf:border-dashed cf:border-white/10 cf:p-4 cf:text-slate-300">
						No audit entries yet.
					</p>
				)}

				{entries.map(entry => (
					<article
						className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4"
						key={entry.id}
					>
						<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-3">
							<div>
								<strong className="cf:block cf:text-sm cf:font-black cf:text-white">
									{formatAction(entry.action)}
								</strong>
								<p className="cf:m-0 cf:mt-1 cf:text-xs cf:font-bold cf:text-slate-400">
									<span title={entry.actorUserId}>{labelForUserID(entry.actorUserId)}</span>
									{' · '}
									{formatDateTime(entry.createdAt)}
								</p>
							</div>

							<span className="cf:rounded-full cf:border cf:border-slate-300/20 cf:bg-slate-300/10 cf:px-3 cf:py-1 cf:text-xs cf:font-extrabold cf:text-slate-100">
								{entry.entityType}
							</span>
						</div>

						<p className="cf:m-0 cf:mt-2 cf:text-xs cf:font-bold cf:text-slate-400">
							Entity: {entry.entityId}
						</p>

						{Object.keys(entry.metadata).length > 0 && (
							<dl className="cf:mt-3 cf:grid cf:gap-2 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-3">
								{Object.entries(entry.metadata).map(([key, value]) => (
									<div className="cf:grid cf:gap-1 cf:sm:grid-cols-[10rem_1fr]" key={key}>
										<dt className="cf:text-xs cf:font-black cf:uppercase cf:tracking-[0.12em] cf:text-slate-400">
											{key}
										</dt>
										<dd className="cf:m-0 cf:text-sm cf:font-bold cf:text-slate-200">{value}</dd>
									</div>
								))}
							</dl>
						)}
					</article>
				))}
			</div>
		</section>
	);
}

/**
 * collectActorUserIDs returns actor IDs shown on the card.
 */
function collectActorUserIDs(entries: readonly AuditLogEntry[]): readonly string[] {
	const seen = new Set<string>();
	const result: string[] = [];

	for (const entry of entries) {
		const actorUserID = entry.actorUserId.trim();
		if (actorUserID === '' || seen.has(actorUserID)) {
			continue;
		}

		seen.add(actorUserID);
		result.push(actorUserID);
	}

	return result;
}

/**
 * formatAction formats machine action names for display.
 */
function formatAction(action: string): string {
	return action
		.split('_')
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

/**
 * formatDateTime returns a readable timestamp.
 */
function formatDateTime(value: string): string {
	if (value.trim() === '') {
		return 'Unknown time';
	}

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

	return 'Could not load audit log.';
}
