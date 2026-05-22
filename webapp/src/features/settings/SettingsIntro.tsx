import type { ReactElement } from 'react';
import { Settings2 } from 'lucide-react';

import { CampfireCardHeader, CampfirePanel } from '@/app/campfire-ui';

/**
 * SettingsIntro explains the purpose of the Settings area.
 */
export function SettingsIntro(): ReactElement {
	return (
		<CampfirePanel>
			<CampfireCardHeader
				eyebrow="Configuration"
				title="Settings are separated by job"
				description="Instead of one giant settings wall, each configuration area now has its own focused page."
				icon={Settings2}
			/>
		</CampfirePanel>
	);
}
