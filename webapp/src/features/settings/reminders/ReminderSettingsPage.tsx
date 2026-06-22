import type { ReactElement } from 'react';

import { CampfirePageIntro } from '@/components/campfire/CampfirePageIntro';
import { useI18n } from '@/i18n';

import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { ReminderSettingsFeedback, ReminderSettingsLoading } from './ReminderSettingsFeedback';
import { ReminderRulesPanel } from './ReminderRulesPanel';
import { useReminderSettings } from './useReminderSettings';

/**
 * ReminderSettingsPage renders workspace reminder settings.
 */
export function ReminderSettingsPage(props: WorkspaceShellProps): ReactElement {
	const { t } = useI18n();
	const canManageReminders = props.canManageWorkspace || props.isSystemAdmin;

	const reminders = useReminderSettings({
		workspace: props.workspace,
		canManageReminders,
	});

	return (
		<div className="campfire-page-stack campfire-settings-workflow campfire-settings-workflow--minimal">
			<CampfirePageIntro
				eyebrow={t('settings.reminders.page.eyebrow')}
				title={t('settings.reminders.page.title')}
				description={t('settings.reminders.page.description')}
			/>

			<ReminderSettingsFeedback
				state={reminders.loadState}
				message={reminders.message}
				messageTone={reminders.messageTone}
			/>

			{!canManageReminders && (
				<ReminderSettingsFeedback
					state="error"
					message={t('settings.reminders.error.permissionViewOnly')}
					messageTone="error"
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
