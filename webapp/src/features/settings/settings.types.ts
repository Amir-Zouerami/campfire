import type { TranslationKey } from '@/i18n';

/**
 * SettingsSectionID identifies one settings sub-page.
 */
export type SettingsSectionID =
	| 'overview'
	| 'roles'
	| 'calendar'
	| 'standups'
	| 'reminders'
	| 'reports'
	| 'audit'
	| 'data'
	| 'global';

/**
 * SettingsSection describes one settings destination.
 */
export type SettingsSection = {
	readonly id: SettingsSectionID;
	readonly labelKey: TranslationKey;
	readonly descriptionKey: TranslationKey;
	readonly adminOnly: boolean;
};
