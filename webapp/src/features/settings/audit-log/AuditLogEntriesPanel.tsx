import type { ReactElement } from 'react';
import { Activity } from 'lucide-react';

import { CampfireBidiText, CampfireEllipsisText } from '@/components/campfire/CampfireBidiText';
import { CampfireEmpty } from '@/components/campfire/CampfireLayoutPrimitives';
import { useI18n } from '@/i18n';
import { sortByNewest } from '@/lib/sort';
import type { AuditLogEntry } from '@/types/domain';

import { formatAuditLabel, formatDateTime, shortID } from './audit-log.helpers';

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
	const { t } = useI18n();
	const entries = sortByNewest(props.entries, entry => entry.createdAt);

	return (
		<section className="campfire-audit-entries-panel">
			<header className="campfire-minimal-section-header">
				<div>
					<p className="campfire-page-eyebrow">{t('settings.audit.entries.eyebrow')}</p>
					<h3>{t('settings.audit.entries.title')}</h3>
				</div>
			</header>

			{entries.length === 0 ? (
				<CampfireEmpty
					icon={Activity}
					title={t('settings.audit.entries.empty.title')}
					description={t('settings.audit.entries.empty.description')}
				/>
			) : (
				<div className="campfire-audit-timeline">
					{entries.map(entry => (
						<AuditEntryRow key={entry.id} entry={entry} actorLabel={props.labelForUserID(entry.actorUserId)} />
					))}
				</div>
			)}
		</section>
	);
}

/**
 * AuditEntryRow renders one audit entry as a flat timeline item.
 */
function AuditEntryRow(props: {
	readonly entry: AuditLogEntry;
	readonly actorLabel: string;
}): ReactElement {
	const { htmlLang, t } = useI18n();
	const metadataRows = Object.entries(props.entry.metadata);

	return (
		<article className="campfire-audit-row">
			<div className="campfire-audit-row-main">
				<div className="campfire-audit-row-title-line">
					<strong><CampfireBidiText>{formatAuditLabel(props.entry.action, t)}</CampfireBidiText></strong>
					<span><CampfireBidiText>{formatAuditLabel(props.entry.entityType, t)}</CampfireBidiText></span>
				</div>

				<p>
					{t('settings.audit.entry.actor', { actor: props.actorLabel })}
					{' · '}{formatDateTime(props.entry.createdAt, htmlLang)}
					{' · '}<CampfireEllipsisText value={props.entry.entityId || t('settings.audit.entry.noEntity')} />
				</p>
			</div>

			<div className="campfire-audit-row-meta">
				<span>{shortID(props.entry.id)}</span>
			</div>

			{metadataRows.length > 0 && (
				<dl className="campfire-audit-metadata">
					{metadataRows.map(([key, value]) => (
						<div key={key}>
							<dt>{formatAuditLabel(key, t)}</dt>
							<dd><CampfireBidiText>{value}</CampfireBidiText></dd>
						</div>
					))}
				</dl>
			)}
		</article>
	);
}
