import type { ReactElement } from 'react';
import { CalendarCheck2, CalendarX2, Users, Umbrella } from 'lucide-react';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from '@/app/campfire-ui';
import type { StandupRunDecision } from '@/types/domain';

import { runtimeDecisionLabel, runtimeDecisionTone, runtimeReasonLabel } from './team-runtime.helpers';

/**
 * TeamRuntimeHeroProps contains runtime decision summary metrics.
 */
type TeamRuntimeHeroProps = {
	readonly date: string;
	readonly decision: StandupRunDecision | null;
	readonly profilesLoading: boolean;
};

/**
 * TeamRuntimeHero renders the runtime decision page header.
 */
export function TeamRuntimeHero(props: TeamRuntimeHeroProps): ReactElement {
	const decisionTone = runtimeDecisionTone(props.decision);
	const DecisionIcon = props.decision?.shouldRun === false ? CalendarX2 : CalendarCheck2;

	return (
		<CampfirePanel>
			<CampfireCardHeader
				eyebrow="Runtime"
				title="Standup run decision"
				description="Check whether standup automation should run for one workspace date."
				icon={DecisionIcon}
				action={
					<CampfireStatusPill tone={decisionTone}>{runtimeDecisionLabel(props.decision)}</CampfireStatusPill>
				}
			/>

			<CampfireCardBody className="campfire-context-grid">
				<CampfireMetric
					label="Decision"
					value={props.decision === null ? 'Pending' : props.decision.shouldRun ? 'Run' : 'Skip'}
					helper={props.decision === null ? props.date : runtimeReasonLabel(props.decision.reason)}
					icon={DecisionIcon}
				/>
				<CampfireMetric
					label="Members"
					value={String(props.decision?.memberCount ?? 0)}
					helper="Workspace members"
					icon={Users}
				/>
				<CampfireMetric
					label="On leave"
					value={String(props.decision?.onLeaveMemberCount ?? 0)}
					helper="Approved leave"
					icon={Umbrella}
				/>
				<CampfireMetric
					label="Profiles"
					value={props.profilesLoading ? 'Loading' : 'Ready'}
					helper="Leave user labels"
				/>
			</CampfireCardBody>
		</CampfirePanel>
	);
}
