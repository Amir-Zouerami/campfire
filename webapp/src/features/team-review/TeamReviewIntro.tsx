import type { ReactElement } from 'react';
import { ShieldCheck } from 'lucide-react';

import { CampfireCardHeader, CampfirePanel } from '@/app/campfire-ui';

/**
 * TeamReviewIntro explains the purpose of the review area.
 */
export function TeamReviewIntro(): ReactElement {
	return (
		<CampfirePanel>
			<CampfireCardHeader
				eyebrow="Team workspace"
				title="Review what needs attention"
				description="This area is separated from My Day so normal users are not overwhelmed with team-level review, reports, or operational diagnostics."
				icon={ShieldCheck}
			/>
		</CampfirePanel>
	);
}
