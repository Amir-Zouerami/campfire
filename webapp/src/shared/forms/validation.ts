import type { TranslationKey } from '@/shared/i18n';

/**
 * msg types a validation message as a translation key. Schemas use keys as their error
 * messages; the form layer translates them for display, so validation is language-neutral.
 *
 *   z.string().min(1, msg('setup.error.nameRequired'))
 */
export function msg(key: TranslationKey): string {
	return key;
}
