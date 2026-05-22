import type { TeamReviewSection } from './team-review.types';

/**
 * teamReviewSections defines focused team review sub-pages.
 */
export const teamReviewSections: readonly TeamReviewSection[] = [
	{
		id: 'standups',
		label: 'Standups',
		description: 'Submitted, missing, on-leave, and answer review for a date.',
		managerOnly: true,
		approverOnly: false,
	},
	{
		id: 'availability',
		label: 'Availability',
		description: 'Who is out today, approved leave, and upcoming coverage.',
		managerOnly: true,
		approverOnly: false,
	},
	{
		id: 'approvals',
		label: 'Approvals',
		description: 'Pending leave requests that need an approver decision.',
		managerOnly: false,
		approverOnly: true,
	},
	{
		id: 'runtime',
		label: 'Runtime',
		description: 'Why standups should or should not run for a selected day.',
		managerOnly: true,
		approverOnly: false,
	},
];
