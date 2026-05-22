import type { ReactElement } from 'react';

import { CampfireCardBody, CampfirePanel } from '@/app/campfire-ui';
import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { StandupConfigurationOverviewPanel } from './StandupConfigurationOverviewPanel';
import { StandupFormsPanel } from './StandupFormsPanel';
import { StandupSchedulesPanel } from './StandupSchedulesPanel';
import { StandupSettingsFeedback, StandupSettingsLoading } from './StandupSettingsFeedback';
import { StandupSettingsHero } from './StandupSettingsHero';
import { useStandupSettings } from './useStandupSettings';

/**
 * StandupSettingsPage renders focused standup form and schedule settings.
 */
export function StandupSettingsPage(props: WorkspaceShellProps): ReactElement {
	const canManageStandups = props.capabilities.canManageStandups || props.canManageWorkspace || props.isSystemAdmin;

	const standups = useStandupSettings({
		workspace: props.workspace,
		canManageStandups,
		refreshToken: props.standupRefreshToken,
		onConfigurationChanged: props.onStandupConfigurationChanged,
	});

	return (
		<div className="cf:grid cf:gap-5">
			<StandupSettingsHero
				templateCount={standups.templates.length}
				activeTemplateCount={standups.activeTemplateCount}
				questionCount={standups.questions.length}
				reportQuestionCount={standups.reportQuestionCount}
				scheduleCount={standups.schedules.length}
				enabledScheduleCount={standups.enabledScheduleCount}
				dailyScheduleCount={standups.dailyScheduleCount}
				weeklyScheduleCount={standups.weeklyScheduleCount}
				canManageStandups={canManageStandups}
			/>

			<CampfirePanel>
				<CampfireCardBody className="cf:grid cf:gap-5">
					<StandupSettingsFeedback state={standups.loadState} message={standups.message} />

					{!canManageStandups && (
						<StandupSettingsFeedback
							state="error"
							message="You can view standup settings, but only workspace Leads and system admins can edit them."
						/>
					)}

					{standups.loadState === 'loading' && <StandupSettingsLoading />}
				</CampfireCardBody>
			</CampfirePanel>

			{standups.loadState !== 'loading' && (
				<>
					<StandupConfigurationOverviewPanel templateDetails={standups.templateDetails} />

					<StandupSchedulesPanel
						templates={standups.sortedTemplates}
						schedulesWithDrafts={standups.schedulesWithDrafts}
						newSchedule={standups.newSchedule}
						disabled={standups.isBusy}
						canManageStandups={canManageStandups}
						savingID={standups.savingID}
						onNewScheduleChange={standups.updateNewSchedule}
						onScheduleDraftChange={standups.updateScheduleDraft}
						onCreateSchedule={standups.createSchedule}
						onSaveSchedule={standups.saveSchedule}
					/>

					<StandupFormsPanel
						templates={standups.sortedTemplates}
						templatesWithDrafts={standups.templatesWithDrafts}
						newTemplate={standups.newTemplate}
						newQuestion={standups.newQuestion}
						disabled={standups.isBusy}
						canManageStandups={canManageStandups}
						savingID={standups.savingID}
						onNewTemplateChange={standups.updateNewTemplate}
						onNewQuestionChange={standups.updateNewQuestion}
						onTemplateDraftChange={standups.updateTemplateDraft}
						onQuestionDraftChange={standups.updateQuestionDraft}
						onCreateTemplate={standups.createTemplate}
						onSaveTemplate={standups.saveTemplate}
						onCreateQuestion={standups.createQuestion}
						onSaveQuestion={standups.saveQuestion}
					/>
				</>
			)}
		</div>
	);
}
