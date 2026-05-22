import type { ReactElement } from 'react';

import { CampfireCardBody, CampfirePanel } from '@/app/campfire-ui';

import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { ReportRulesFeedback, ReportRulesLoading } from './ReportRulesFeedback';
import { ReportRulesHero } from './ReportRulesHero';
import { ReportRulesPanel } from './ReportRulesPanel';
import { useReportRules } from './useReportRules';

/**
 * ReportRulesSettingsPage renders workspace scheduled-report settings.
 */
export function ReportRulesSettingsPage(props: WorkspaceShellProps): ReactElement {
	const canManageReportRules = props.canManageWorkspace || props.isSystemAdmin;

	const reportRules = useReportRules({
		workspace: props.workspace,
		canManageReportRules,
	});

	return (
		<div className="cf:grid cf:gap-5">
			<ReportRulesHero
				ruleCount={reportRules.rules.length}
				enabledCount={reportRules.enabledCount}
				autoPostCount={reportRules.autoPostCount}
				previewRequiredCount={reportRules.previewRequiredCount}
				blockerCount={reportRules.blockerCount}
				canManageReportRules={canManageReportRules}
			/>

			<CampfirePanel>
				<CampfireCardBody className="cf:grid cf:gap-5">
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
							disabled={reportRules.isBusy}
							canManageReportRules={canManageReportRules}
							savingRuleID={reportRules.savingRuleID}
							onDraftChange={reportRules.updateDraft}
							onSave={reportRules.saveRule}
						/>
					)}
				</CampfireCardBody>
			</CampfirePanel>
		</div>
	);
}
