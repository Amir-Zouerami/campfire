/**
 * MyDaySectionID identifies one personal workflow page inside My Day.
 */
export type MyDaySectionID = 'check-in' | 'time-log' | 'leave';

/**
 * MyDaySection describes a focused personal workflow page.
 */
export type MyDaySection = {
	readonly id: MyDaySectionID;
	readonly label: string;
	readonly eyebrow: string;
	readonly title: string;
	readonly description: string;
	readonly helper: string;
};
