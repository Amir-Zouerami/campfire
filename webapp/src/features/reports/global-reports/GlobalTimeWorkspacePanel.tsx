import type { ReactElement } from 'react';
import { Globe2 } from 'lucide-react';

import { CampfireEllipsisText } from '@/components/campfire/CampfireBidiText';
import { CampfireEmpty } from '@/components/campfire/CampfireLayoutPrimitives';
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
	const workspaces = [...props.workspaces].sort((left, right) => right.totalMinutes - left.totalMinutes);

	return (
		<section className="campfire-report-list-panel">
			<header className="campfire-report-section-header">
				<div>
					<p className="campfire-page-eyebrow">Workspace totals</p>
					<h3 className="campfire-surface-title">Time by workspace</h3>
				</div>
			</header>

			{workspaces.length === 0 ? (
				<CampfireEmpty
					icon={Globe2}
					title="No workspace time"
					description="No time entries matched this global range."
				/>
			) : (
				<div className="campfire-report-compact-grid">
					{workspaces.map(workspace => (
						<article key={workspace.workspaceId} className="campfire-report-compact-card">
							<CampfireEllipsisText value={workspace.workspaceName} className="campfire-report-compact-title" />
							<div className="campfire-report-compact-meta">
								<span>{formatMinutes(workspace.totalMinutes)}</span>
								<span>{workspace.entryCount} {workspace.entryCount === 1 ? 'entry' : 'entries'}</span>
							</div>
						</article>
					))}
				</div>
			)}
		</section>
	);
}
