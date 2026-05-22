import type { ReactElement } from 'react';
import { Globe2 } from 'lucide-react';

import { CampfireEmpty, CampfireStatusPill } from '@/app/campfire-ui';
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
	return (
		<section className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5">
			<div>
				<p className="cf:text-sm cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
					Workspace totals
				</p>
				<h3 className="cf:mt-1 cf:text-xl cf:font-black cf:tracking-[-0.03em] cf:text-foreground">
					Time by workspace
				</h3>
			</div>

			{props.workspaces.length === 0 ? (
				<CampfireEmpty
					icon={Globe2}
					title="No workspace time"
					description="No time entries matched this global range."
				/>
			) : (
				<div className="cf:grid cf:gap-3 cf:xl:grid-cols-2">
					{props.workspaces.map(workspace => (
						<article
							key={workspace.workspaceId}
							className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4"
						>
							<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-2">
								<h4 className="cf:min-w-0 cf:truncate cf:text-base cf:font-black cf:text-foreground">
									{workspace.workspaceName}
								</h4>
								<CampfireStatusPill tone="green">
									{formatMinutes(workspace.totalMinutes)}
								</CampfireStatusPill>
							</div>
							<p className="cf:mt-2 cf:text-sm cf:font-semibold cf:text-muted-foreground">
								{workspace.entryCount} {workspace.entryCount === 1 ? 'entry' : 'entries'}
							</p>
						</article>
					))}
				</div>
			)}
		</section>
	);
}
