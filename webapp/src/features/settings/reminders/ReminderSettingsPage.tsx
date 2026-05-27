import type { ReactElement } from 'react';

import { CampfireCardBody, CampfirePanel } from '@/app/campfire-ui';

import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { ReminderSettingsFeedback, ReminderSettingsLoading } from './ReminderSettingsFeedback';
import { ReminderSettingsHero } from './ReminderSettingsHero';
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
		<div className="cf:grid cf:gap-5">
			<ReminderSettingsHero
				ruleCount={reminders.rules.length}
				enabledCount={reminders.enabledCount}
				dmEnabledCount={reminders.dmEnabledCount}
				channelEnabledCount={reminders.channelEnabledCount}
				offsetCount={reminders.offsetCount}
				canManageReminders={canManageReminders}
			/>

			<CampfirePanel>
				<CampfireCardBody className="cf:grid cf:gap-5">
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
				</CampfireCardBody>
			</CampfirePanel>
		</div>
	);
}
