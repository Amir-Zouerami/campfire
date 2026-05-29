import type { ReactElement } from 'react';
import { Globe2, Tags } from 'lucide-react';

import type { GlobalLeaveReportTypeSummary, GlobalLeaveReportWorkspaceSummary } from '@/types/domain';
import { CampfireEmpty, CampfireStatusPill } from '@/components/campfire/CampfireLayoutPrimitives';

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
		<div className="cf:grid cf:gap-5 cf:xl:grid-cols-2">
			<BreakdownPanel
				title="Workspaces"
				description="Leave by workspace"
				icon={Globe2}
				emptyTitle="No workspace breakdown"
			>
				{props.workspaces.map(workspace => (
					<BreakdownRow
						key={workspace.workspaceId}
						title={workspace.workspaceName}
						approvedCount={workspace.approvedCount}
						pendingCount={workspace.pendingCount}
					/>
				))}
			</BreakdownPanel>

			<BreakdownPanel
				title="Leave types"
				description="Leave by type"
				icon={Tags}
				emptyTitle="No leave-type breakdown"
			>
				{props.types.map(typeSummary => (
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
		<section className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5">
			<div>
				<p className="cf:flex cf:items-center cf:gap-2 cf:text-sm cf:font-semibold cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
					<Icon className="cf:size-4" />
					{props.title}
				</p>
				<h3 className="cf:mt-1 cf:text-xl cf:font-semibold cf:tracking-[-0.03em] cf:text-foreground">
					{props.description}
				</h3>
			</div>

			{props.children.length === 0 ? (
				<CampfireEmpty
					icon={Icon}
					title={props.emptyTitle}
					description="Load a report with matching rows to see a breakdown."
				/>
			) : (
				<div className="cf:grid cf:gap-3">{props.children}</div>
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
		<article className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4">
			<h4 className="cf:truncate cf:text-base cf:font-semibold cf:text-foreground">{props.title}</h4>

			<div className="cf:mt-3 cf:flex cf:flex-wrap cf:gap-2">
				<CampfireStatusPill tone="green">{props.approvedCount} approved</CampfireStatusPill>
				<CampfireStatusPill tone="ember">{props.pendingCount} pending</CampfireStatusPill>
			</div>
		</article>
	);
}
