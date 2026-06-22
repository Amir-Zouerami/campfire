import type { ReactElement } from 'react';

import { CampfirePageIntro } from '@/components/campfire/CampfirePageIntro';
import { useI18n } from '@/i18n';
import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { ReportRulesFeedback, ReportRulesLoading } from './ReportRulesFeedback';
import { ReportRulesPanel } from './ReportRulesPanel';
import { useReportRules } from './useReportRules';

/**
 * ReportRulesSettingsPage renders scheduled report-rule configuration.
 */
export function ReportRulesSettingsPage(props: WorkspaceShellProps): ReactElement {
	const { t } = useI18n();
	const canManageReportRules = props.canManageWorkspace || props.isSystemAdmin;

	const reportRules = useReportRules({
		workspace: props.workspace,
		canManageReportRules,
	});

	return (
		<div className="campfire-page-stack campfire-settings-workflow campfire-settings-workflow--minimal">
			<CampfirePageIntro
				eyebrow={t('settings.reportRules.page.eyebrow')}
				title={t('settings.reportRules.page.title')}
				description={t('settings.reportRules.page.description')}
			/>

			<ReportRulesFeedback
				state={reportRules.loadState}
				message={reportRules.message}
				messageTone={reportRules.messageTone}
			/>

			{!canManageReportRules && (
				<ReportRulesFeedback
					state="error"
					message={t('settings.reportRules.error.permissionViewOnly')}
					messageTone="error"
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
