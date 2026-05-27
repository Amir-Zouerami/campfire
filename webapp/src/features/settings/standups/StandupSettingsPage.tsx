import { useState } from 'react';
import type { ReactElement } from 'react';
import { CalendarClock, FileQuestion, ListChecks } from 'lucide-react';

import { CampfireCardBody, CampfirePanel } from '@/app/campfire-ui';
import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';
import { cn } from '@/lib/utils';

import { StandupConfigurationOverviewPanel } from './StandupConfigurationOverviewPanel';
import { StandupFormsPanel } from './StandupFormsPanel';
import { StandupSchedulesPanel } from './StandupSchedulesPanel';
import { StandupSettingsFeedback, StandupSettingsLoading } from './StandupSettingsFeedback';
import { StandupSettingsHero } from './StandupSettingsHero';
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
	readonly icon: typeof ListChecks;
};

/**
 * standupSettingsSections lists focused standup configuration areas.
 */
const standupSettingsSections: readonly StandupSettingsSection[] = [
	{
		id: 'overview',
		label: 'Overview',
		description: 'Review templates, schedules, and questions.',
		icon: ListChecks,
	},
	{
		id: 'schedules',
		label: 'Schedules',
		description: 'Control when daily and weekly forms run.',
		icon: CalendarClock,
	},
	{
		id: 'forms',
		label: 'Form builder',
		description: 'Create templates and edit questions.',
		icon: FileQuestion,
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

					{standups.loadState !== 'loading' && (
						<StandupSettingsNavigation
							activeSectionID={activeSectionID}
							onSelectSection={setActiveSectionID}
						/>
					)}
				</CampfireCardBody>
			</CampfirePanel>

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
 * StandupSettingsNavigation renders local standup settings navigation.
 */
function StandupSettingsNavigation(props: {
	readonly activeSectionID: StandupSettingsSectionID;
	readonly onSelectSection: (sectionID: StandupSettingsSectionID) => void;
}): ReactElement {
	return (
		<nav className="campfire-standup-settings-nav" aria-label="Standup settings sections">
			{standupSettingsSections.map(section => {
				const active = section.id === props.activeSectionID;
				const Icon = section.icon;

				return (
					<button
						key={section.id}
						type="button"
						aria-current={active ? 'page' : undefined}
						className={cn(
							'campfire-standup-settings-nav-button',
							active && 'campfire-standup-settings-nav-button--active',
						)}
						onClick={() => props.onSelectSection(section.id)}
					>
						<span className="campfire-standup-settings-nav-icon">
							<Icon className="cf:size-5" />
						</span>

						<span className="cf:min-w-0">
							<span className="cf:block cf:text-base cf:font-black cf:tracking-[-0.02em] cf:text-foreground">
								{section.label}
							</span>
							<span className="cf:mt-1 cf:block cf:text-sm cf:font-semibold cf:leading-5 cf:text-muted-foreground">
								{section.description}
							</span>
						</span>
					</button>
				);
			})}
		</nav>
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
