/**
 * TeamReviewSectionID identifies one Team Review sub-page.
 */
export type TeamReviewSectionID = 'standups' | 'availability' | 'approvals' | 'runtime';

/**
 * TeamReviewSection describes one Team Review destination.
 */
export type TeamReviewSection = {
	readonly id: TeamReviewSectionID;
	readonly label: string;
	readonly description: string;
	readonly managerOnly: boolean;
	readonly approverOnly: boolean;
};
