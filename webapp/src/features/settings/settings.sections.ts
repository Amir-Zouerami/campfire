import type { SettingsSection } from './settings.types';

/**
 * settingsSections defines focused configuration pages.
 */
export const settingsSections: readonly SettingsSection[] = [
	{
		id: 'overview',
		labelKey: 'settings.sections.overview.label',
		descriptionKey: 'settings.sections.overview.description',
		adminOnly: false,
	},
	{
		id: 'roles',
		labelKey: 'settings.sections.roles.label',
		descriptionKey: 'settings.sections.roles.description',
		adminOnly: false,
	},
	{
		id: 'calendar',
		labelKey: 'settings.sections.calendar.label',
		descriptionKey: 'settings.sections.calendar.description',
		adminOnly: false,
	},
	{
		id: 'standups',
		labelKey: 'settings.sections.standups.label',
		descriptionKey: 'settings.sections.standups.description',
		adminOnly: false,
	},
	{
		id: 'reminders',
		labelKey: 'settings.sections.reminders.label',
		descriptionKey: 'settings.sections.reminders.description',
		adminOnly: false,
	},
	{
		id: 'reports',
		labelKey: 'settings.sections.reports.label',
		descriptionKey: 'settings.sections.reports.description',
		adminOnly: false,
	},
	{
		id: 'audit',
		labelKey: 'settings.sections.audit.label',
		descriptionKey: 'settings.sections.audit.description',
		adminOnly: false,
	},
	{
		id: 'data',
		labelKey: 'settings.sections.data.label',
		descriptionKey: 'settings.sections.data.description',
		adminOnly: false,
	},
	{
		id: 'global',
		labelKey: 'settings.sections.global.label',
		descriptionKey: 'settings.sections.global.description',
		adminOnly: true,
	},
];
