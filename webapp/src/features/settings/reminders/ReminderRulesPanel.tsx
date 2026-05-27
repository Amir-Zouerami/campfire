import type { ReactElement } from 'react';
import { BellRing } from 'lucide-react';

import { CampfireEmpty } from '@/app/campfire-ui';
import { scheduleLabelForRule, type StandupScheduleLabelLookup } from '@/features/settings/standup-schedule-labels';
import type { ReminderRule } from '@/types/domain';

import { ReminderRuleCard } from './ReminderRuleCard';
import type { ReminderRuleDraftPatch, ReminderRuleWithDraft } from './reminders.types';

/**
 * ReminderRulesPanelProps contains reminder rules and edit actions.
 */
type ReminderRulesPanelProps = {
	readonly rulesWithDrafts: readonly ReminderRuleWithDraft[];
	readonly scheduleLabels: StandupScheduleLabelLookup;
	readonly disabled: boolean;
	readonly canManageReminders: boolean;
	readonly savingRuleID: string;
	readonly onDraftChange: (ruleID: string, patch: ReminderRuleDraftPatch) => void;
	readonly onSave: (rule: ReminderRule) => Promise<void>;
};

/**
 * ReminderRulesPanel renders all editable reminder rules.
 */
export function ReminderRulesPanel(props: ReminderRulesPanelProps): ReactElement {
	return (
		<section className="campfire-settings-rule-list">
			{props.rulesWithDrafts.length === 0 ? (
				<CampfireEmpty
					icon={BellRing}
					title="No reminder rules yet"
					description="Reminder rules are created from standup schedules. Add a daily or weekly schedule first."
				/>
			) : (
				props.rulesWithDrafts.map(pair => (
					<ReminderRuleCard
						key={pair.rule.id}
						scheduleLabel={scheduleLabelForRule(props.scheduleLabels, pair.rule.scheduleId)}
						rule={pair.rule}
						draft={pair.draft}
						disabled={props.disabled}
						canManageReminders={props.canManageReminders}
						saving={props.savingRuleID === pair.rule.id}
						onDraftChange={props.onDraftChange}
						onSave={props.onSave}
					/>
				))
			)}
		</section>
	);
}
