import type { ReactElement } from 'react';
import { Globe2, Tags } from 'lucide-react';

import { CampfireEllipsisText } from '@/components/campfire/CampfireBidiText';
import { CampfireEmpty } from '@/components/campfire/CampfireLayoutPrimitives';
import type { GlobalLeaveReportTypeSummary, GlobalLeaveReportWorkspaceSummary } from '@/types/domain';

/**
 * GlobalLeaveBreakdownPanelProps contains global leave summary breakdowns.
 */
type GlobalLeaveBreakdownPanelProps = {
	readonly workspaces: readonly GlobalLeaveReportWorkspaceSummary[];
	readonly types: readonly GlobalLeaveReportTypeSummary[];
};

/**
 * GlobalLeaveBreakdownPanel renders workspace and leave-type global summaries.
 */
export function GlobalLeaveBreakdownPanel(props: GlobalLeaveBreakdownPanelProps): ReactElement {
	return (
		<div className="campfire-report-breakdown-grid">
			<BreakdownPanel title="Workspaces" description="Leave by workspace" icon={Globe2} emptyTitle="No workspace breakdown">
				{[...props.workspaces]
					.sort((left, right) => right.approvedCount + right.pendingCount - (left.approvedCount + left.pendingCount))
					.map(workspace => (
						<BreakdownRow
							key={workspace.workspaceId}
							title={workspace.workspaceName}
							approvedCount={workspace.approvedCount}
							pendingCount={workspace.pendingCount}
						/>
					))}
			</BreakdownPanel>

			<BreakdownPanel title="Leave types" description="Leave by type" icon={Tags} emptyTitle="No leave-type breakdown">
				{[...props.types]
					.sort((left, right) => right.approvedCount + right.pendingCount - (left.approvedCount + left.pendingCount))
					.map(typeSummary => (
						<BreakdownRow
							key={`${typeSummary.leaveTypeName}-${typeSummary.leaveTypeColor}`}
							title={typeSummary.leaveTypeName}
							approvedCount={typeSummary.approvedCount}
							pendingCount={typeSummary.pendingCount}
						/>
					))}
			</BreakdownPanel>
		</div>
	);
}

/**
 * BreakdownPanel renders a global leave summary list.
 */
function BreakdownPanel(props: {
	readonly title: string;
	readonly description: string;
	readonly icon: typeof Globe2;
	readonly emptyTitle: string;
	readonly children: readonly ReactElement[];
}): ReactElement {
	const Icon = props.icon;

	return (
		<section className="campfire-report-list-panel">
			<header className="campfire-report-section-header">
				<div>
					<p className="campfire-page-eyebrow cf:flex cf:items-center cf:gap-2">
						<Icon className="cf:size-4" />
						{props.title}
					</p>
					<h3 className="campfire-surface-title">{props.description}</h3>
				</div>
			</header>

			{props.children.length === 0 ? (
				<CampfireEmpty
					icon={Icon}
					title={props.emptyTitle}
					description="Load a report with matching rows to see a breakdown."
				/>
			) : (
				<div className="campfire-report-row-list">{props.children}</div>
			)}
		</section>
	);
}

/**
 * BreakdownRow renders one global leave summary row.
 */
function BreakdownRow(props: {
	readonly title: string;
	readonly approvedCount: number;
	readonly pendingCount: number;
}): ReactElement {
	return (
		<article className="campfire-report-compact-card campfire-report-compact-card--row">
			<CampfireEllipsisText value={props.title} className="campfire-report-compact-title" />
			<div className="campfire-report-compact-meta">
				<span>{props.approvedCount} approved</span>
				<span>{props.pendingCount} pending</span>
			</div>
		</article>
	);
}
