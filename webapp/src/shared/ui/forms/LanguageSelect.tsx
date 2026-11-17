import { Languages } from 'lucide-react';
import type { ReactElement } from 'react';

import { languageNativeName, languages, useI18n, useLanguagePreference } from '@/shared/i18n';
import type { LanguagePreference } from '@/shared/i18n';

import { Select } from './Select';

/**
 * LanguageSelect lets a person choose the interface language, overriding the workspace default.
 */
export function LanguageSelect(): ReactElement {
	const { t } = useI18n();
	const { preference, setPreference } = useLanguagePreference();

	return (
		<Select
			label={t('shared.language.label')}
			icon={Languages}
			value={preference}
			onChange={value => setPreference(value as LanguagePreference)}
			options={[
				{ value: 'auto', label: t('shared.language.auto') },
				...languages.map(language => ({ value: language, label: languageNativeName(language) })),
			]}
		/>
	);
}
