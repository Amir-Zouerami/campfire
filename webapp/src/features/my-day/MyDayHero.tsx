import type { ReactElement } from 'react';

import { CampfireCardHeader, CampfirePanel, CampfireStatusPill } from '@/app/campfire-ui';

import { iconForMyDaySection } from './my-day.helpers';
import type { MyDaySection } from './my-day.types';

/**
 * MyDayHeroProps contains the active personal workflow section context.
 */
type MyDayHeroProps = {
	readonly activeSection: MyDaySection;
	readonly workspaceName: string;
};

/**
 * MyDayHero renders a compact personal page header.
 */
export function MyDayHero(props: MyDayHeroProps): ReactElement {
	const Icon = iconForMyDaySection(props.activeSection.id);

	return (
		<CampfirePanel className="campfire-compact-section-intro">
			<CampfireCardHeader
				eyebrow={props.activeSection.eyebrow}
				title={props.activeSection.title}
				description={`${props.activeSection.description} · ${props.workspaceName}`}
				icon={Icon}
				action={<CampfireStatusPill tone="ember">My Day</CampfireStatusPill>}
			/>
		</CampfirePanel>
	);
}
