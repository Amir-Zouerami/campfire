/**
 * ReportsSectionID identifies one report sub-page.
 */
export type ReportsSectionID = 'daily' | 'weekly' | 'time' | 'exports' | 'saved' | 'global';

/**
 * ReportsSection describes one reporting destination.
 */
export type ReportsSection = {
	readonly id: ReportsSectionID;
	readonly label: string;
	readonly description: string;
	readonly globalOnly: boolean;
};
