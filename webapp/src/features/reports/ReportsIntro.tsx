import type { ReactElement } from 'react';
import { BarChart3 } from 'lucide-react';

import { CampfireCardHeader, CampfirePanel } from '@/app/campfire-ui';

/**
 * ReportsIntro explains the purpose of the Reports area.
 */
export function ReportsIntro(): ReactElement {
	return (
		<CampfirePanel>
			<CampfireCardHeader
				eyebrow="Reporting"
				title="Preview, post, and export"
				description="Reports live away from the daily submission flow. This keeps My Day simple while giving Leads and Admins a dedicated reporting workspace."
				icon={BarChart3}
			/>
		</CampfirePanel>
	);
}
