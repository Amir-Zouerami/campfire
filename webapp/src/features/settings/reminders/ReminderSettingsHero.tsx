import type { ReactElement } from 'react';
import { BellRing, MessageSquareWarning, Send, Timer } from 'lucide-react';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from '@/app/campfire-ui';

/**
 * ReminderSettingsHeroProps contains reminder settings summary metrics.
 */
type ReminderSettingsHeroProps = {
	readonly ruleCount: number;
	readonly enabledCount: number;
	readonly dmEnabledCount: number;
	readonly channelEnabledCount: number;
	readonly offsetCount: number;
	readonly canManageReminders: boolean;
};

/**
 * ReminderSettingsHero renders the reminder settings header.
 */
export function ReminderSettingsHero(props: ReminderSettingsHeroProps): ReactElement {
	return (
		<CampfirePanel>
			<CampfireCardHeader
				eyebrow="Reminders"
				title="Standup reminder rules"
				description="Configure DM nudges, channel reminders, and exact reminder offsets from each schedule time."
				icon={BellRing}
				action={
					<CampfireStatusPill tone={props.canManageReminders ? 'green' : 'slate'}>
						{props.canManageReminders ? 'Editable' : 'Read-only'}
					</CampfireStatusPill>
				}
			/>

			<CampfireCardBody className="campfire-context-grid">
				<CampfireMetric
					label="Rules"
					value={String(props.ruleCount)}
					helper={`${props.enabledCount} enabled`}
					icon={BellRing}
				/>
				<CampfireMetric
					label="DM reminders"
					value={String(props.dmEnabledCount)}
					helper="User nudges"
					icon={Send}
				/>
				<CampfireMetric
					label="Channel reminders"
					value={String(props.channelEnabledCount)}
					helper="Missing users"
					icon={MessageSquareWarning}
				/>
				<CampfireMetric
					label="Offsets"
					value={String(props.offsetCount)}
					helper="Configured sends"
					icon={Timer}
				/>
			</CampfireCardBody>
		</CampfirePanel>
	);
}
