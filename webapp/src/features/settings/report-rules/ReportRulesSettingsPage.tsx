import type { ReactElement } from 'react';

import { CampfirePageIntro } from '@/components/campfire/CampfirePageIntro';
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
		<div className="campfire-page-stack campfire-settings-workflow campfire-settings-workflow--minimal">
			<CampfirePageIntro
				eyebrow="Report rules"
				title="Scheduled report behavior"
				description="Choose what scheduled reports include and whether they post automatically. Manual preview and one-off posting stay in Reports."
			/>

			<ReportRulesFeedback state={reportRules.loadState} message={reportRules.message} />

			{!canManageReportRules && (
				<ReportRulesFeedback
					state="error"
					message="You can view report rules, but only workspace Leads and system admins can edit them."
				/>
			)}

			{reportRules.loadState === 'loading' && <ReportRulesLoading />}

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
