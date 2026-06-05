import type { ReactElement } from 'react';

import { CampfirePageIntro } from '@/components/campfire/CampfirePageIntro';

import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { ReminderSettingsFeedback, ReminderSettingsLoading } from './ReminderSettingsFeedback';
import { ReminderRulesPanel } from './ReminderRulesPanel';
import { useReminderSettings } from './useReminderSettings';

/**
 * ReminderSettingsPage renders workspace reminder settings.
 */
export function ReminderSettingsPage(props: WorkspaceShellProps): ReactElement {
	const canManageReminders = props.canManageWorkspace || props.isSystemAdmin;

	const reminders = useReminderSettings({
		workspace: props.workspace,
		canManageReminders,
	});

	return (
		<div className="campfire-page-stack campfire-settings-workflow campfire-settings-workflow--minimal">
			<CampfirePageIntro
				eyebrow="Reminders"
				title="DM and channel reminder rules"
				description="Configure when Campfire nudges people who have not submitted. Submitted users and approved-leave users are skipped automatically."
			/>

			<ReminderSettingsFeedback state={reminders.loadState} message={reminders.message} />

			{!canManageReminders && (
				<ReminderSettingsFeedback
					state="error"
					message="You can view reminder settings, but only workspace Leads and system admins can edit them."
				/>
			)}

			{reminders.loadState === 'loading' && <ReminderSettingsLoading />}

			{reminders.loadState !== 'loading' && (
				<ReminderRulesPanel
					rulesWithDrafts={reminders.rulesWithDrafts}
					scheduleLabels={reminders.scheduleLabels}
					disabled={reminders.isBusy}
					canManageReminders={canManageReminders}
					savingRuleID={reminders.savingRuleID}
					onDraftChange={reminders.updateDraft}
					onSave={reminders.saveRule}
				/>
			)}
		</div>
	);
}
