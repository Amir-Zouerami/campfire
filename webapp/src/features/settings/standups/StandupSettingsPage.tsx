import { useState } from 'react';
import type { ReactElement } from 'react';
import { CalendarClock, FileQuestion, ListChecks, Route, ShieldCheck } from 'lucide-react';

import {
	CampfirePageHeader,
	CampfireStatCard,
	CampfireSurface,
	CampfireWorkflowNote,
} from '@/components/campfire/CampfireLayoutPrimitives';
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
	readonly label: string;
	readonly description: string;
};

/**
 * standupSettingsSections lists focused standup configuration areas.
 */
const standupSettingsSections: readonly StandupSettingsSection[] = [
	{
		id: 'overview',
		label: 'Overview',
		description: 'Review templates, schedules, and questions.',
	},
	{
		id: 'schedules',
		label: 'Schedules',
		description: 'Control when daily and weekly forms run.',
	},
	{
		id: 'forms',
		label: 'Form builder',
		description: 'Create templates and edit questions.',
	},
];

/**
 * StandupSettingsPage renders focused standup form and schedule settings.
 */
export function StandupSettingsPage(props: WorkspaceShellProps): ReactElement {
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
			<CampfirePageHeader
				eyebrow="Settings"
				title="Standup Forms"
				description="Manage templates, schedules, and task-creating questions without nesting the whole setup inside another dashboard."
			/>

			<div className="campfire-stat-grid campfire-stat-grid--four">
				<CampfireStatCard
					icon={FileQuestion}
					label="Templates"
					value={String(standups.templates.length)}
					helper={`${standups.activeTemplateCount} active`}
				/>
				<CampfireStatCard
					icon={ListChecks}
					label="Questions"
					value={String(standups.questions.length)}
					helper={`${standups.reportQuestionCount} in reports`}
					tone="blue"
				/>
				<CampfireStatCard
					icon={CalendarClock}
					label="Schedules"
					value={String(standups.schedules.length)}
					helper={`${standups.enabledScheduleCount} enabled`}
					tone="green"
				/>
				<CampfireStatCard
					icon={ShieldCheck}
					label="Access"
					value={canManageStandups ? 'Editable' : 'Read only'}
					helper="Lead/system admin controlled"
					tone={canManageStandups ? 'green' : 'slate'}
				/>
			</div>

			<CampfireWorkflowNote
				icon={Route}
				title="Template rules are enforced server-side."
				description="Names are unique per workspace, and activating a daily template automatically deactivates the previous active daily template."
			/>

			<CampfireSurface className="campfire-standup-settings-nav-surface">
				<StandupSettingsFeedback state={standups.loadState} message={standups.message} />

				{!canManageStandups && (
					<StandupSettingsFeedback
						state="error"
						message="You can view standup settings, but only workspace Leads and system admins can edit them."
					/>
				)}

				{standups.loadState === 'loading' && <StandupSettingsLoading />}

				{standups.loadState !== 'loading' && (
					<CampfireSegmentedTabs
						label="Standup settings sections"
						activeValue={activeSectionID}
						tabs={standupSettingsSections.map(section => ({
							value: section.id,
							label: section.label,
							description: section.description,
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
					onCreateQuestion={props.standups.createQuestion}
					onSaveQuestion={props.standups.saveQuestion}
				/>
			);
	}
}
