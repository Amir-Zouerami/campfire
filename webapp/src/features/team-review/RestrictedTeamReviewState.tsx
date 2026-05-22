import type { ReactElement } from 'react';
import { EyeOff } from 'lucide-react';

import { CampfireCardBody, CampfireEmpty, CampfirePanel } from '@/app/campfire-ui';

/**
 * RestrictedTeamReviewState renders a friendly permission state.
 */
export function RestrictedTeamReviewState(): ReactElement {
	return (
		<CampfirePanel>
			<CampfireCardBody>
				<CampfireEmpty
					icon={EyeOff}
					title="Team review is not available"
					description="This page is for workspace Leads, leave Approvers, and Campfire Admins. Your personal workflow remains available in My Day."
				/>
			</CampfireCardBody>
		</CampfirePanel>
	);
}
