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
	| 'global';

/**
 * SettingsSection describes one settings destination.
 */
export type SettingsSection = {
	readonly id: SettingsSectionID;
	readonly label: string;
	readonly description: string;
	readonly adminOnly: boolean;
};
