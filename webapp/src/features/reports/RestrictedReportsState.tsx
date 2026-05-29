import type { ReactElement } from 'react';
import { EyeOff } from 'lucide-react';

import { CampfireEmptyState, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';

/**
 * RestrictedReportsState renders a calm report permission state.
 */
export function RestrictedReportsState(): ReactElement {
	return (
		<CampfireSurface className="campfire-restricted-surface">
			<CampfireEmptyState
				icon={EyeOff}
				title="Reports are not available"
				description="Workspace reports are available to Leads, Viewers, and Admins. Your daily workflow remains available in My Day."
			/>
		</CampfireSurface>
	);
}
