import type { TeamReviewSection } from './team-review.types';

/**
 * teamReviewSections defines focused team review sub-pages.
 */
export const teamReviewSections: readonly TeamReviewSection[] = [
	{
		id: 'standups',
		labelKey: 'teamReview.sections.standups.label',
		descriptionKey: 'teamReview.sections.standups.description',
		managerOnly: true,
		approverOnly: false,
	},
	{
		id: 'availability',
		labelKey: 'teamReview.sections.availability.label',
		descriptionKey: 'teamReview.sections.availability.description',
		managerOnly: true,
		approverOnly: false,
	},
	{
		id: 'approvals',
		labelKey: 'teamReview.sections.approvals.label',
		descriptionKey: 'teamReview.sections.approvals.description',
		managerOnly: false,
		approverOnly: true,
	},
	{
		id: 'runtime',
		labelKey: 'teamReview.sections.runtime.label',
		descriptionKey: 'teamReview.sections.runtime.description',
		managerOnly: true,
		approverOnly: false,
	},
];
