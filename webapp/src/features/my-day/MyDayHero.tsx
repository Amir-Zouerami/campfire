import type { ReactElement } from 'react';
import { CalendarDays } from 'lucide-react';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from '@/app/campfire-ui';

import { formatTodayLabel, iconForMyDaySection } from './my-day.helpers';
import type { MyDaySection } from './my-day.types';

/**
 * MyDayHeroProps contains the active personal workflow section context.
 */
type MyDayHeroProps = {
	readonly activeSection: MyDaySection;
	readonly workspaceName: string;
};

/**
 * MyDayHero renders the simple personal page header.
 */
export function MyDayHero(props: MyDayHeroProps): ReactElement {
	const Icon = iconForMyDaySection(props.activeSection.id);

	return (
		<CampfirePanel className="cf:overflow-hidden">
			<CampfireCardHeader
				eyebrow={props.activeSection.eyebrow}
				title={props.activeSection.title}
				description={props.activeSection.description}
				icon={Icon}
				action={<CampfireStatusPill tone="ember">My Day</CampfireStatusPill>}
			/>

			<CampfireCardBody className="campfire-context-grid">
				<CampfireMetric label="Workspace" value={props.workspaceName} helper="Current channel" />
				<CampfireMetric
					label="Today"
					value={formatTodayLabel()}
					helper="Local browser date"
					icon={CalendarDays}
				/>
				<CampfireMetric
					label="Current flow"
					value={props.activeSection.label}
					helper={props.activeSection.helper}
				/>
			</CampfireCardBody>
		</CampfirePanel>
	);
}
