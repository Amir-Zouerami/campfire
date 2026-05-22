import type { ReactElement } from 'react';
import { ClipboardCheck, Hourglass, Umbrella } from 'lucide-react';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from '@/app/campfire-ui';

/**
 * TeamLeaveApprovalsHeroProps contains summary metrics for approval queue.
 */
type TeamLeaveApprovalsHeroProps = {
	readonly pendingCount: number;
	readonly profilesLoading: boolean;
};

/**
 * TeamLeaveApprovalsHero renders the approval queue header.
 */
export function TeamLeaveApprovalsHero(props: TeamLeaveApprovalsHeroProps): ReactElement {
	return (
		<CampfirePanel>
			<CampfireCardHeader
				eyebrow="Approvals"
				title="Leave approval queue"
				description="Approve or reject pending leave requests. This is separate from My Day so members only see their own leave workflow."
				icon={ClipboardCheck}
				action={<CampfireStatusPill tone="ember">Approver workspace</CampfireStatusPill>}
			/>

			<CampfireCardBody className="campfire-context-grid">
				<CampfireMetric
					label="Pending requests"
					value={String(props.pendingCount)}
					helper="Need a decision"
					icon={Hourglass}
				/>
				<CampfireMetric
					label="Profiles"
					value={props.profilesLoading ? 'Loading' : 'Ready'}
					helper="Requester labels"
				/>
				<CampfireMetric
					label="Workflow"
					value="Approve / Reject"
					helper="With optional comment"
					icon={Umbrella}
				/>
			</CampfireCardBody>
		</CampfirePanel>
	);
}
