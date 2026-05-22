import type { SettingsSection } from './settings.types';

/**
 * settingsSections defines focused configuration pages.
 */
export const settingsSections: readonly SettingsSection[] = [
	{
		id: 'overview',
		label: 'Overview',
		description: 'Workspace identity, channel context, board link, and timezone.',
		adminOnly: false,
	},
	{
		id: 'roles',
		label: 'Roles & Access',
		description: 'Review Leads, Approvers, Viewers, members, and inherited access.',
		adminOnly: false,
	},
	{
		id: 'calendar',
		label: 'Working Calendar',
		description: 'Working days and workspace off-days.',
		adminOnly: false,
	},
	{
		id: 'standups',
		label: 'Standup Forms',
		description: 'Templates, questions, schedules, and daily/weekly behavior.',
		adminOnly: false,
	},
	{
		id: 'reminders',
		label: 'Reminders',
		description: 'DM reminders, channel reminders, and exact reminder offsets.',
		adminOnly: false,
	},
	{
		id: 'reports',
		label: 'Report Rules',
		description: 'Markdown report options, sorting, and inclusion settings.',
		adminOnly: false,
	},
	{
		id: 'audit',
		label: 'Audit Log',
		description: 'Important workspace changes and actions.',
		adminOnly: false,
	},
	{
		id: 'global',
		label: 'Global Off-days',
		description: 'Organization-wide holidays managed by Campfire Admins.',
		adminOnly: true,
	},
];
