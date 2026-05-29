import type { ReactElement } from 'react';
import { EyeOff } from 'lucide-react';

import { CampfireEmptyState, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';

/**
 * RestrictedSettingsState renders a calm settings permission state.
 */
export function RestrictedSettingsState(): ReactElement {
	return (
		<CampfireSurface className="campfire-restricted-surface">
			<CampfireEmptyState
				icon={EyeOff}
				title="Settings are restricted"
				description="Only workspace Leads and Campfire Admins can configure roles, schedules, reminders, reports, and calendar rules."
			/>
		</CampfireSurface>
	);
}
