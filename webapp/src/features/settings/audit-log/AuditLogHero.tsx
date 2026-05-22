import type { ReactElement } from 'react';
import { Activity, FileClock, ShieldCheck, UsersRound } from 'lucide-react';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from '@/app/campfire-ui';

/**
 * AuditLogHeroProps contains audit-log summary metrics.
 */
type AuditLogHeroProps = {
	readonly entryCount: number;
	readonly actorCount: number;
	readonly actionCount: number;
	readonly profilesLoading: boolean;
};

/**
 * AuditLogHero renders the audit-log page header.
 */
export function AuditLogHero(props: AuditLogHeroProps): ReactElement {
	return (
		<CampfirePanel>
			<CampfireCardHeader
				eyebrow="Audit Log"
				title="Workspace activity history"
				description="Review recent configuration, reporting, leave, and workflow actions recorded for this workspace."
				icon={Activity}
				action={<CampfireStatusPill tone="ember">Recent activity</CampfireStatusPill>}
			/>

			<CampfireCardBody className="campfire-context-grid">
				<CampfireMetric
					label="Entries"
					value={String(props.entryCount)}
					helper="Loaded rows"
					icon={FileClock}
				/>
				<CampfireMetric
					label="Actors"
					value={String(props.actorCount)}
					helper={props.profilesLoading ? 'Resolving names' : 'Resolved names'}
					icon={UsersRound}
				/>
				<CampfireMetric
					label="Actions"
					value={String(props.actionCount)}
					helper="Unique action types"
					icon={ShieldCheck}
				/>
			</CampfireCardBody>
		</CampfirePanel>
	);
}
