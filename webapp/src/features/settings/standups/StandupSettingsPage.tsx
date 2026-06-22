import { useState } from 'react';
import type { ReactElement } from 'react';

import { CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';
import { useI18n } from '@/i18n';
import { CampfireSegmentedTabs } from '@/components/campfire/CampfireSegmentedTabs';
import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { StandupConfigurationOverviewPanel } from './StandupConfigurationOverviewPanel';
import { StandupFormsPanel } from './StandupFormsPanel';
import { StandupSchedulesPanel } from './StandupSchedulesPanel';
import { StandupSettingsFeedback, StandupSettingsLoading } from './StandupSettingsFeedback';
import { useStandupSettings } from './useStandupSettings';

/**
 * StandupSettingsSectionID identifies one focused standup settings sub-section.
 */
type StandupSettingsSectionID = 'overview' | 'schedules' | 'forms';

/**
 * StandupSettingsSection describes one focused standup settings sub-section.
 */
type StandupSettingsSection = {
	readonly id: StandupSettingsSectionID;
	readonly labelKey: 'settings.standups.sections.overview.label' | 'settings.standups.sections.schedules.label' | 'settings.standups.sections.forms.label';
	readonly descriptionKey: 'settings.standups.sections.overview.description' | 'settings.standups.sections.schedules.description' | 'settings.standups.sections.forms.description';
};

/**
 * standupSettingsSections lists focused standup configuration areas.
 */
const standupSettingsSections: readonly StandupSettingsSection[] = [
	{
		id: 'overview',
		labelKey: 'settings.standups.sections.overview.label',
		descriptionKey: 'settings.standups.sections.overview.description',
	},
	{
		id: 'schedules',
		labelKey: 'settings.standups.sections.schedules.label',
		descriptionKey: 'settings.standups.sections.schedules.description',
	},
	{
		id: 'forms',
		labelKey: 'settings.standups.sections.forms.label',
		descriptionKey: 'settings.standups.sections.forms.description',
	},
];

/**
 * StandupSettingsPage renders focused standup form and schedule settings.
 */
export function StandupSettingsPage(props: WorkspaceShellProps): ReactElement {
	const { t } = useI18n();
	const [activeSectionID, setActiveSectionID] = useState<StandupSettingsSectionID>('overview');

	const canManageStandups = props.capabilities.canManageStandups || props.canManageWorkspace || props.isSystemAdmin;

	const standups = useStandupSettings({
		workspace: props.workspace,
		canManageStandups,
		refreshToken: props.standupRefreshToken,
		onConfigurationChanged: props.onStandupConfigurationChanged,
	});

	return (
		<div className="campfire-page-stack campfire-standup-settings-page">
			<CampfireSurface className="campfire-standup-settings-nav-surface">
				<StandupSettingsFeedback state={standups.loadState} message={standups.message} />

				{!canManageStandups && (
					<StandupSettingsFeedback
						state="error"
						message={t('settings.standups.error.permissionViewOnly')}
					/>
				)}

				{standups.loadState === 'loading' && <StandupSettingsLoading />}

				{standups.loadState !== 'loading' && (
					<CampfireSegmentedTabs
						label={t('settings.standups.sections.ariaLabel')}
						activeValue={activeSectionID}
						tabs={standupSettingsSections.map(section => ({
							value: section.id,
							label: t(section.labelKey),
							description: t(section.descriptionKey),
						}))}
						onChange={setActiveSectionID}
					/>
				)}
			</CampfireSurface>

			{standups.loadState !== 'loading' && (
				<StandupSettingsSectionPanel
					activeSectionID={activeSectionID}
					standups={standups}
					canManageStandups={canManageStandups}
				/>
			)}
		</div>
	);
}

/**
 * StandupSettingsSectionPanel renders only the selected standup settings area.
 */
function StandupSettingsSectionPanel(props: {
	readonly activeSectionID: StandupSettingsSectionID;
	readonly standups: ReturnType<typeof useStandupSettings>;
	readonly canManageStandups: boolean;
}): ReactElement {
	switch (props.activeSectionID) {
		case 'overview':
			return <StandupConfigurationOverviewPanel templateDetails={props.standups.templateDetails} />;

		case 'schedules':
			return (
				<StandupSchedulesPanel
					templates={props.standups.sortedTemplates}
					schedulesWithDrafts={props.standups.schedulesWithDrafts}
					newSchedule={props.standups.newSchedule}
					disabled={props.standups.isBusy}
					canManageStandups={props.canManageStandups}
					savingID={props.standups.savingID}
					onNewScheduleChange={props.standups.updateNewSchedule}
					onScheduleDraftChange={props.standups.updateScheduleDraft}
					onCreateSchedule={props.standups.createSchedule}
					onSaveSchedule={props.standups.saveSchedule}
					onDeleteSchedule={props.standups.deleteSchedule}
				/>
			);

		case 'forms':
			return (
				<StandupFormsPanel
					templates={props.standups.sortedTemplates}
					templatesWithDrafts={props.standups.templatesWithDrafts}
					newTemplate={props.standups.newTemplate}
					newQuestion={props.standups.newQuestion}
					disabled={props.standups.isBusy}
					canManageStandups={props.canManageStandups}
					savingID={props.standups.savingID}
					onNewTemplateChange={props.standups.updateNewTemplate}
					onNewQuestionChange={props.standups.updateNewQuestion}
					onTemplateDraftChange={props.standups.updateTemplateDraft}
					onQuestionDraftChange={props.standups.updateQuestionDraft}
					onCreateTemplate={props.standups.createTemplate}
					onSaveTemplate={props.standups.saveTemplate}
					onDeleteTemplate={props.standups.deleteTemplate}
					onCreateQuestion={props.standups.createQuestion}
					onSaveQuestion={props.standups.saveQuestion}
					onDeleteQuestion={props.standups.deleteQuestion}
				/>
			);
	}
}

