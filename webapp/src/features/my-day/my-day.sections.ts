import type { MyDaySection } from './my-day.types';

/**
 * DEFAULT_MY_DAY_SECTION is the initial personal workflow section.
 */
export const DEFAULT_MY_DAY_SECTION: MyDaySection = {
	id: 'check-in',
	label: 'Check-in',
	eyebrow: 'Standup',
	title: 'What are you working on today?',
	description: 'Fill the current daily or weekly standup. This is the primary Campfire workflow for normal members.',
	helper: 'Submit/update standup',
};

/**
 * myDaySections defines the user-facing personal workflow.
 */
export const myDaySections: readonly MyDaySection[] = [
	DEFAULT_MY_DAY_SECTION,
	{
		id: 'time-log',
		label: 'Time log',
		eyebrow: 'Tasks & time',
		title: 'Log time without digging through reports',
		description:
			'Create your own tasks, pick an active task, and log time for any date. Reporting stays outside this screen.',
		helper: 'Create task / log time',
	},
	{
		id: 'leave',
		label: 'Leave',
		eyebrow: 'Availability',
		title: 'Request or review your own leave',
		description: 'Request time away and track your own active requests. Team approval queues stay in Team Review.',
		helper: 'Personal leave only',
	},
];
