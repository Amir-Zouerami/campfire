import type { ReactElement } from 'react';
import { ClipboardList, FileCheck2, Clock, Send } from 'lucide-react';

import { CampfireStatCard, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';
import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { ReportRulesFeedback, ReportRulesLoading } from './ReportRulesFeedback';
import { ReportRulesPanel } from './ReportRulesPanel';
import { useReportRules } from './useReportRules';

/**
 * ReportRulesSettingsPage renders scheduled report-rule configuration.
 */
export function ReportRulesSettingsPage(props: WorkspaceShellProps): ReactElement {
	const canManageReportRules = props.canManageWorkspace || props.isSystemAdmin;

	const reportRules = useReportRules({
		workspace: props.workspace,
		canManageReportRules,
	});

	return (
		<div className="campfire-page-stack campfire-settings-workflow">
			<div className="campfire-stat-grid campfire-stat-grid--four">
				<CampfireStatCard icon={ClipboardList} label="Rules" value={String(reportRules.rules.length)} helper="Report schedules" />
				<CampfireStatCard
					icon={FileCheck2}
					label="Enabled"
					value={String(reportRules.enabledCount)}
					helper="Can generate"
					tone={reportRules.enabledCount > 0 ? 'green' : 'slate'}
				/>
				<CampfireStatCard icon={Send} label="Auto post" value={String(reportRules.autoPostCount)} helper="Posts to channel" />
				<CampfireStatCard
					icon={Clock}
					label="Preview required"
					value={String(reportRules.previewRequiredCount)}
					helper="Manual review"
				/>
			</div>

			<CampfireSurface className="campfire-control-surface campfire-settings-control-surface">
				<header className="campfire-flat-section-header">
					<div>
						<p className="campfire-page-eyebrow">Report rules</p>
						<h3 className="campfire-surface-title">Scheduled report behavior</h3>
						<p className="campfire-surface-description">
							Control posting, preview, missing-member, leave, time, and blocker behavior from one focused list.
						</p>
					</div>
					<ClipboardList className="campfire-flat-header-icon" aria-hidden="true" />
				</header>

				<ReportRulesFeedback state={reportRules.loadState} message={reportRules.message} />

				{!canManageReportRules && (
					<ReportRulesFeedback
						state="error"
						message="You can view report rules, but only workspace Leads and system admins can edit them."
					/>
				)}

				{reportRules.loadState === 'loading' && <ReportRulesLoading />}
			</CampfireSurface>

			{reportRules.loadState !== 'loading' && (
				<ReportRulesPanel
					rulesWithDrafts={reportRules.rulesWithDrafts}
					scheduleLabels={reportRules.scheduleLabels}
					disabled={reportRules.isBusy}
					canManageReportRules={canManageReportRules}
					savingRuleID={reportRules.savingRuleID}
					onDraftChange={reportRules.updateDraft}
					onSave={reportRules.saveRule}
				/>
			)}
		</div>
	);
}
