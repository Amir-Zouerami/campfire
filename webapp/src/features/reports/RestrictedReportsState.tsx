import type { ReactElement } from 'react';
import { EyeOff } from 'lucide-react';

import { CampfireCardBody, CampfireEmpty, CampfirePanel } from '@/app/campfire-ui';

/**
 * RestrictedReportsState renders a friendly report permission state.
 */
export function RestrictedReportsState(): ReactElement {
	return (
		<CampfirePanel>
			<CampfireCardBody>
				<CampfireEmpty
					icon={EyeOff}
					title="Reports are not available"
					description="Workspace reports are available to Leads, Viewers, and Admins. Your daily workflow remains available in My Day."
				/>
			</CampfireCardBody>
		</CampfirePanel>
	);
}
