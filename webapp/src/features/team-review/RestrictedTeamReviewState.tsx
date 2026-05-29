import type { ReactElement } from 'react';
import { EyeOff } from 'lucide-react';

import { CampfireEmptyState, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';

/**
 * RestrictedTeamReviewState renders a calm team-review permission state.
 */
export function RestrictedTeamReviewState(): ReactElement {
	return (
		<CampfireSurface className="campfire-restricted-surface">
			<CampfireEmptyState
				icon={EyeOff}
				title="Team review is not available"
				description="This page is for workspace Leads, leave Approvers, and Campfire Admins. Your personal workflow remains available in My Day."
			/>
		</CampfireSurface>
	);
}
