import type { ReactElement } from 'react';
import { ClipboardList, Percent, UserRoundCheck, UserRoundX, Users } from 'lucide-react';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from '@/app/campfire-ui';
import type { StandupOccurrenceSummary } from '@/types/domain';

/**
 * TeamStandupsHeroProps contains summary metrics for standup review.
 */
type TeamStandupsHeroProps = {
	readonly summary: StandupOccurrenceSummary | null;
	readonly submittedPercent: number;
	readonly occurrenceDate: string;
	readonly profilesLoading: boolean;
};

/**
 * TeamStandupsHero renders the standup review header.
 */
export function TeamStandupsHero(props: TeamStandupsHeroProps): ReactElement {
	return (
		<CampfirePanel>
			<CampfireCardHeader
				eyebrow="Standups"
				title="Standup review"
				description="Review submitted updates, missing members, and on-leave users for one occurrence date."
				icon={ClipboardList}
				action={<CampfireStatusPill tone="ember">Team workflow</CampfireStatusPill>}
			/>

			<CampfireCardBody className="campfire-context-grid">
				<CampfireMetric
					label="Members"
					value={String(props.summary?.memberUserIds.length ?? 0)}
					helper={props.occurrenceDate}
					icon={Users}
				/>
				<CampfireMetric
					label="Submitted"
					value={String(props.summary?.submittedUserIds.length ?? 0)}
					helper="Completed check-ins"
					icon={UserRoundCheck}
				/>
				<CampfireMetric
					label="Missing"
					value={String(props.summary?.missingUserIds.length ?? 0)}
					helper="Need follow-up"
					icon={UserRoundX}
				/>
				<CampfireMetric
					label="Completion"
					value={`${props.submittedPercent}%`}
					helper={props.profilesLoading ? 'Profiles loading' : 'Profiles ready'}
					icon={Percent}
				/>
			</CampfireCardBody>
		</CampfirePanel>
	);
}
