import type { ReactElement } from 'react';
import { EyeOff } from 'lucide-react';

import { CampfireCardBody, CampfireEmpty, CampfirePanel } from '@/app/campfire-ui';

/**
 * RestrictedSettingsState renders a friendly settings permission state.
 */
export function RestrictedSettingsState(): ReactElement {
	return (
		<CampfirePanel>
			<CampfireCardBody>
				<CampfireEmpty
					icon={EyeOff}
					title="Settings are restricted"
					description="Only workspace Leads and Campfire Admins can configure roles, schedules, reminders, reports, and calendar rules."
				/>
			</CampfireCardBody>
		</CampfirePanel>
	);
}
