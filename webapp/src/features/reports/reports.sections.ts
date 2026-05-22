import type { ReportsSection } from './reports.types';

/**
 * reportSections defines focused report pages.
 */
export const reportSections: readonly ReportsSection[] = [
	{
		id: 'daily',
		label: 'Daily',
		description: 'Preview and post the daily Markdown report.',
		globalOnly: false,
	},
	{
		id: 'weekly',
		label: 'Weekly',
		description: 'Preview and post the weekly Markdown report.',
		globalOnly: false,
	},
	{
		id: 'time',
		label: 'Time',
		description: 'Review time grouped by person, project, task, day, or week.',
		globalOnly: false,
	},
	{
		id: 'exports',
		label: 'CSV',
		description: 'Export workspace standup, missing, leave, and time data.',
		globalOnly: false,
	},
	{
		id: 'saved',
		label: 'Saved filters',
		description: 'Save reusable report views for common workflows.',
		globalOnly: false,
	},
	{
		id: 'global',
		label: 'Global',
		description: 'Cross-workspace time and leave reports for Campfire Admins.',
		globalOnly: true,
	},
];
