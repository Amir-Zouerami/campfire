import type { ReactElement } from 'react';
import { Globe2, Tags } from 'lucide-react';

import { CampfireEllipsisText } from '@/components/campfire/CampfireBidiText';
import { CampfireEmpty } from '@/components/campfire/CampfireLayoutPrimitives';
import { useI18n } from '@/i18n';
import { localizedLeaveTypeName } from '@/features/my-day/leave/my-leave.i18n';
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
	const { t } = useI18n();

	return (
		<div className="campfire-report-breakdown-grid">
			<BreakdownPanel
				title={t('reports.global.leave.breakdown.workspaces.eyebrow')}
				description={t('reports.global.leave.breakdown.workspaces.title')}
				icon={Globe2}
				emptyTitle={t('reports.global.leave.breakdown.workspaces.empty')}
			>
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

			<BreakdownPanel
				title={t('reports.global.leave.breakdown.types.eyebrow')}
				description={t('reports.global.leave.breakdown.types.title')}
				icon={Tags}
				emptyTitle={t('reports.global.leave.breakdown.types.empty')}
			>
				{[...props.types]
					.sort((left, right) => right.approvedCount + right.pendingCount - (left.approvedCount + left.pendingCount))
					.map(typeSummary => (
						<BreakdownRow
							key={`${typeSummary.leaveTypeName}-${typeSummary.leaveTypeColor}`}
							title={localizedLeaveTypeName({ code: '', name: typeSummary.leaveTypeName }, t)}
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
	const { t } = useI18n();
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
					description={t('reports.global.leave.breakdown.empty.description')}
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
	const { t } = useI18n();

	return (
		<article className="campfire-report-compact-card campfire-report-compact-card--row">
			<CampfireEllipsisText value={props.title} className="campfire-report-compact-title" />
			<div className="campfire-report-compact-meta">
				<span>{t('reports.global.leave.count.approved', { count: props.approvedCount })}</span>
				<span>{t('reports.global.leave.count.pending', { count: props.pendingCount })}</span>
			</div>
		</article>
	);
}

