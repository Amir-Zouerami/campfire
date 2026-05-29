import type { ReactElement } from 'react';
import { BellRing, Hash, MessagesSquare, Send } from 'lucide-react';

import { CampfireStatCard, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';

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
		<div className="campfire-page-stack campfire-settings-workflow">
			<div className="campfire-stat-grid campfire-stat-grid--four">
				<CampfireStatCard icon={BellRing} label="Rules" value={String(reminders.rules.length)} helper="Configured schedules" />
				<CampfireStatCard
					icon={Send}
					label="Enabled"
					value={String(reminders.enabledCount)}
					helper="Active reminders"
					tone={reminders.enabledCount > 0 ? 'green' : 'slate'}
				/>
				<CampfireStatCard icon={MessagesSquare} label="DM reminders" value={String(reminders.dmEnabledCount)} helper="Private nudges" />
				<CampfireStatCard icon={Hash} label="Channel reminders" value={String(reminders.channelEnabledCount)} helper="Shared nudges" />
			</div>

			<CampfireSurface className="campfire-control-surface campfire-settings-control-surface">
				<header className="campfire-flat-section-header">
					<div>
						<p className="campfire-page-eyebrow">Reminders</p>
						<h3 className="campfire-surface-title">Reminder delivery rules</h3>
						<p className="campfire-surface-description">
							Tune DM and channel reminders without stacking another settings dashboard inside this page.
						</p>
					</div>
					<BellRing className="campfire-flat-header-icon" aria-hidden="true" />
				</header>

				<ReminderSettingsFeedback state={reminders.loadState} message={reminders.message} />

				{!canManageReminders && (
					<ReminderSettingsFeedback
						state="error"
						message="You can view reminder settings, but only workspace Leads and system admins can edit them."
					/>
				)}

				{reminders.loadState === 'loading' && <ReminderSettingsLoading />}
			</CampfireSurface>

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
