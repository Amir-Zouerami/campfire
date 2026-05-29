import type { ReactElement } from 'react';
import { Activity } from 'lucide-react';

import type { AuditLogEntry } from '@/types/domain';

import { formatAuditLabel, formatDateTime, shortID } from './audit-log.helpers';
import { CampfireEmpty, CampfireStatusPill } from '@/components/campfire/CampfireLayoutPrimitives';

/**
 * AuditLogEntriesPanelProps contains audit entries and actor labels.
 */
type AuditLogEntriesPanelProps = {
	readonly entries: readonly AuditLogEntry[];
	readonly labelForUserID: (userID: string) => string;
};

/**
 * AuditLogEntriesPanel renders recent audit entries.
 */
export function AuditLogEntriesPanel(props: AuditLogEntriesPanelProps): ReactElement {
	return (
		<section className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5">
			<div>
				<p className="cf:text-sm cf:font-semibold cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
					Audit entries
				</p>
				<h3 className="cf:mt-1 cf:text-xl cf:font-semibold cf:tracking-[-0.03em] cf:text-foreground">
					Recent workspace actions
				</h3>
			</div>

			{props.entries.length === 0 ? (
				<CampfireEmpty
					icon={Activity}
					title="No audit entries yet"
					description="Important workspace actions will appear here after they are recorded."
				/>
			) : (
				<div className="cf:grid cf:gap-3">
					{props.entries.map(entry => (
						<AuditEntryRow
							key={entry.id}
							entry={entry}
							actorLabel={props.labelForUserID(entry.actorUserId)}
						/>
					))}
				</div>
			)}
		</section>
	);
}

/**
 * AuditEntryRow renders one audit entry.
 */
function AuditEntryRow(props: { readonly entry: AuditLogEntry; readonly actorLabel: string }): ReactElement {
	const metadataRows = Object.entries(props.entry.metadata);

	return (
		<article className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4">
			<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-3">
				<div className="cf:min-w-0">
					<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
						<h4 className="cf:min-w-0 cf:truncate cf:text-base cf:font-semibold cf:text-foreground">
							{formatAuditLabel(props.entry.action)}
						</h4>
						<CampfireStatusPill tone="ember">{formatAuditLabel(props.entry.entityType)}</CampfireStatusPill>
					</div>

					<p className="cf:mt-2 cf:text-sm cf:font-semibold cf:text-muted-foreground">
						Actor:{' '}
						<span className="cf:font-semibold cf:text-slate-200" title={props.entry.actorUserId}>
							{props.actorLabel}
						</span>
					</p>

					<p className="cf:mt-1 cf:text-xs cf:font-bold cf:text-slate-500">
						Entity {props.entry.entityId || 'none'} · {formatDateTime(props.entry.createdAt)}
					</p>
				</div>

				<CampfireStatusPill tone="slate">{shortID(props.entry.id)}</CampfireStatusPill>
			</div>

			{metadataRows.length > 0 && (
				<div className="cf:grid cf:gap-2 cf:sm:grid-cols-2">
					{metadataRows.map(([key, value]) => (
						<div
							key={key}
							className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-3"
						>
							<span className="cf:block cf:text-xs cf:font-semibold cf:uppercase cf:tracking-widest cf:text-amber-200">
								{formatAuditLabel(key)}
							</span>
							<strong className="cf:mt-1 cf:block cf:break-words cf:text-sm cf:font-bold cf:text-foreground">
								{value}
							</strong>
						</div>
					))}
				</div>
			)}
		</article>
	);
}
