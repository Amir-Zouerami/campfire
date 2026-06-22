import type { ReactElement } from 'react';
import { EyeOff } from 'lucide-react';

import { CampfireEmptyState, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';
import { useI18n } from '@/i18n';

/**
 * RestrictedSettingsState renders a calm settings permission state.
 */
export function RestrictedSettingsState(): ReactElement {
	const { t } = useI18n();

	return (
		<CampfireSurface className="campfire-restricted-surface">
			<CampfireEmptyState
				icon={EyeOff}
				title={t('settings.restricted.title')}
				description={t('settings.restricted.description')}
			/>
		</CampfireSurface>
	);
}
