import type { ReportsSection } from './reports.types';

/**
 * reportSections defines focused report pages.
 */
export const reportSections: readonly ReportsSection[] = [
	{
		id: 'daily',
		labelKey: 'reports.sections.daily.label',
		descriptionKey: 'reports.sections.daily.description',
		globalOnly: false,
	},
	{
		id: 'weekly',
		labelKey: 'reports.sections.weekly.label',
		descriptionKey: 'reports.sections.weekly.description',
		globalOnly: false,
	},
	{
		id: 'time',
		labelKey: 'reports.sections.time.label',
		descriptionKey: 'reports.sections.time.description',
		globalOnly: false,
	},
	{
		id: 'exports',
		labelKey: 'reports.sections.exports.label',
		descriptionKey: 'reports.sections.exports.description',
		globalOnly: false,
	},
	{
		id: 'saved',
		labelKey: 'reports.sections.saved.label',
		descriptionKey: 'reports.sections.saved.description',
		globalOnly: false,
	},
	{
		id: 'global',
		labelKey: 'reports.sections.global.label',
		descriptionKey: 'reports.sections.global.description',
		globalOnly: true,
	},
];
