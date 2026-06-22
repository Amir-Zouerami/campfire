import type { ReactElement } from 'react';
import { EyeOff } from 'lucide-react';

import { CampfireEmptyState, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';
import { useI18n } from '@/i18n';

/**
 * RestrictedReportsState renders a calm report permission state.
 */
export function RestrictedReportsState(): ReactElement {
	const { t } = useI18n();

	return (
		<CampfireSurface className="campfire-restricted-surface">
			<CampfireEmptyState
				icon={EyeOff}
				title={t('reports.restricted.title')}
				description={t('reports.restricted.description')}
			/>
		</CampfireSurface>
	);
}
