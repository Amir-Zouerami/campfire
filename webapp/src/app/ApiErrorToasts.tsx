import { useEffect } from 'react';

import { apiFailures } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { toast } from '@/shared/ui';

/**
 * ApiErrorToasts turns every failed API request into a toast, so individual features only
 * deal with their own success path and inline validation.
 */
export function ApiErrorToasts(): null {
	const { t } = useI18n();

	useEffect(() => {
		return apiFailures.subscribe(({ error }) => {
			toast.error(error.message.trim() === '' ? t('common.loadFailed') : error.message);
		});
	}, [t]);

	return null;
}
