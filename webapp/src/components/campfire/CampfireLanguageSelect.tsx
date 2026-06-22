import type { ReactElement } from 'react';

import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { useI18n } from '@/i18n';
import type { CampfireLanguage } from '@/i18n';

const languageOptions: readonly CampfireLanguage[] = ['english', 'persian', 'arabic'];

/**
 * CampfireLanguageSelectProps contains one generated-message language selector.
 */
type CampfireLanguageSelectProps = {
	readonly id: string;
	readonly value: CampfireLanguage;
	readonly disabled?: boolean;
	readonly onChange: (language: CampfireLanguage) => void;
};

/**
 * CampfireLanguageSelect renders generated-message languages with the same
 * Campfire dropdown used by report, schedule, and timezone controls.
 */
export function CampfireLanguageSelect(props: CampfireLanguageSelectProps): ReactElement {
	const { t } = useI18n();

	return (
		<CampfireSelect
			id={props.id}
			value={props.value}
			disabled={props.disabled}
			onValueChange={value => props.onChange(toCampfireLanguage(value))}
		>
			{languageOptions.map(language => (
				<option key={language} value={language}>
					{languageLabel(language, t)}
				</option>
			))}
		</CampfireSelect>
	);
}

/**
 * toCampfireLanguage ignores impossible DOM values and keeps the selector typed.
 */
function toCampfireLanguage(value: string): CampfireLanguage {
	return languageOptions.includes(value as CampfireLanguage) ? (value as CampfireLanguage) : 'english';
}

/**
 * languageLabel returns the localized display label for one language value.
 */
function languageLabel(language: CampfireLanguage, t: ReturnType<typeof useI18n>['t']): string {
	switch (language) {
		case 'english':
			return t('common.english');
		case 'persian':
			return t('common.persian');
		case 'arabic':
			return t('common.arabic');
	}
}
