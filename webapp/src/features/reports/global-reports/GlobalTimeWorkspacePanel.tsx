import type { ReactElement } from 'react';
import { Globe2 } from 'lucide-react';

import { CampfireEllipsisText } from '@/components/campfire/CampfireBidiText';
import { CampfireEmpty } from '@/components/campfire/CampfireLayoutPrimitives';
import { useI18n } from '@/i18n';
import type { GlobalTimeReportWorkspaceSummary } from '@/types/domain';

import { formatMinutes } from './global-reports.helpers';

/**
 * GlobalTimeWorkspacePanelProps contains workspace time totals.
 */
type GlobalTimeWorkspacePanelProps = {
	readonly workspaces: readonly GlobalTimeReportWorkspaceSummary[];
};

/**
 * GlobalTimeWorkspacePanel renders workspace totals for global time reports.
 */
export function GlobalTimeWorkspacePanel(props: GlobalTimeWorkspacePanelProps): ReactElement {
	const { t } = useI18n();
	const workspaces = [...props.workspaces].sort((left, right) => right.totalMinutes - left.totalMinutes);

	return (
		<section className="campfire-report-list-panel">
			<header className="campfire-report-section-header">
				<div>
					<p className="campfire-page-eyebrow">{t('reports.global.time.workspace.eyebrow')}</p>
					<h3 className="campfire-surface-title">{t('reports.global.time.workspace.title')}</h3>
				</div>
			</header>

			{workspaces.length === 0 ? (
				<CampfireEmpty
					icon={Globe2}
					title={t('reports.global.time.workspace.empty.title')}
					description={t('reports.global.time.workspace.empty.description')}
				/>
			) : (
				<div className="campfire-report-compact-grid">
					{workspaces.map(workspace => (
						<article key={workspace.workspaceId} className="campfire-report-compact-card">
							<CampfireEllipsisText value={workspace.workspaceName} className="campfire-report-compact-title" />
							<div className="campfire-report-compact-meta">
								<span>{formatMinutes(workspace.totalMinutes)}</span>
								<span>
									{workspace.entryCount}{' '}
									{workspace.entryCount === 1 ? t('reports.global.entry.singular') : t('reports.global.entry.pluralShort')}
								</span>
							</div>
						</article>
					))}
				</div>
			)}
		</section>
	);
}
