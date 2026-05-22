import type { ReactElement } from 'react';
import { ClipboardList } from 'lucide-react';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from '@/app/campfire-ui';

/**
 * StandupSettingsHeroProps contains high-level standup configuration metrics.
 */
type StandupSettingsHeroProps = {
	readonly templateCount: number;
	readonly activeTemplateCount: number;
	readonly questionCount: number;
	readonly reportQuestionCount: number;
	readonly scheduleCount: number;
	readonly enabledScheduleCount: number;
	readonly dailyScheduleCount: number;
	readonly weeklyScheduleCount: number;
	readonly canManageStandups: boolean;
};

/**
 * StandupSettingsHero summarizes the standup configuration section.
 */
export function StandupSettingsHero(props: StandupSettingsHeroProps): ReactElement {
	return (
		<CampfirePanel>
			<CampfireCardHeader
				eyebrow="Standups"
				title="Forms and schedules"
				description="Manage the async rhythm for this workspace without mixing it into My Day or Team Review."
				icon={ClipboardList}
				action={
					<CampfireStatusPill tone={props.canManageStandups ? 'green' : 'slate'}>
						{props.canManageStandups ? 'Editable' : 'Read only'}
					</CampfireStatusPill>
				}
			/>

			<CampfireCardBody className="cf:grid cf:gap-3 cf:md:grid-cols-4">
				<CampfireMetric
					label="Templates"
					value={String(props.templateCount)}
					helper={`${props.activeTemplateCount} active`}
				/>
				<CampfireMetric
					label="Questions"
					value={String(props.questionCount)}
					helper={`${props.reportQuestionCount} shown in reports`}
				/>
				<CampfireMetric
					label="Schedules"
					value={String(props.scheduleCount)}
					helper={`${props.enabledScheduleCount} enabled`}
				/>
				<CampfireMetric
					label="Daily / weekly"
					value={`${props.dailyScheduleCount} / ${props.weeklyScheduleCount}`}
					helper="Configured run types"
				/>
			</CampfireCardBody>
		</CampfirePanel>
	);
}
