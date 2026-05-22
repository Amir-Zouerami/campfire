import type { ReactElement } from 'react';
import { FileText, MessageSquareShare, ShieldCheck, Workflow } from 'lucide-react';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from '@/app/campfire-ui';

/**
 * ReportRulesHeroProps contains report-rule summary metrics.
 */
type ReportRulesHeroProps = {
	readonly ruleCount: number;
	readonly enabledCount: number;
	readonly autoPostCount: number;
	readonly previewRequiredCount: number;
	readonly blockerCount: number;
	readonly canManageReportRules: boolean;
};

/**
 * ReportRulesHero renders the report rules settings header.
 */
export function ReportRulesHero(props: ReportRulesHeroProps): ReactElement {
	return (
		<CampfirePanel>
			<CampfireCardHeader
				eyebrow="Report rules"
				title="Scheduled report behavior"
				description="Configure whether reports post automatically, require preview, and include missing, leave, time, or blocker sections."
				icon={Workflow}
				action={
					<CampfireStatusPill tone={props.canManageReportRules ? 'green' : 'slate'}>
						{props.canManageReportRules ? 'Editable' : 'Read-only'}
					</CampfireStatusPill>
				}
			/>

			<CampfireCardBody className="campfire-context-grid">
				<CampfireMetric
					label="Rules"
					value={String(props.ruleCount)}
					helper={`${props.enabledCount} enabled`}
					icon={FileText}
				/>
				<CampfireMetric
					label="Auto-post"
					value={String(props.autoPostCount)}
					helper="Posts to channel"
					icon={MessageSquareShare}
				/>
				<CampfireMetric
					label="Preview"
					value={String(props.previewRequiredCount)}
					helper="Manual review"
					icon={ShieldCheck}
				/>
				<CampfireMetric label="Blockers" value={String(props.blockerCount)} helper="Included sections" />
			</CampfireCardBody>
		</CampfirePanel>
	);
}
