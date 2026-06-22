import type { ReactElement } from 'react';
import { EyeOff } from 'lucide-react';

import { CampfireEmptyState, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';
import { useI18n } from '@/i18n';

/**
 * RestrictedTeamReviewState renders a calm team-review permission state.
 */
export function RestrictedTeamReviewState(): ReactElement {
	const { t } = useI18n();

	return (
		<CampfireSurface className="campfire-restricted-surface">
			<CampfireEmptyState
				icon={EyeOff}
				title={t('teamReview.restricted.title')}
				description={t('teamReview.restricted.description')}
			/>
		</CampfireSurface>
	);
}
