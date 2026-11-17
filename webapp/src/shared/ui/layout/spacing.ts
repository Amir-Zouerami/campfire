/**
 * Gap is the spacing scale shared by every layout component.
 * Class names are spelled out in full so Tailwind can see them at build time.
 */
export type Gap = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;

export const GAP_CLASS: Readonly<Record<Gap, string>> = {
	0: 'cf:gap-0',
	1: 'cf:gap-1',
	2: 'cf:gap-2',
	3: 'cf:gap-3',
	4: 'cf:gap-4',
	5: 'cf:gap-5',
	6: 'cf:gap-6',
	8: 'cf:gap-8',
	10: 'cf:gap-10',
	12: 'cf:gap-12',
};

export type Align = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type Justify = 'start' | 'center' | 'end' | 'between';

export const ALIGN_CLASS: Readonly<Record<Align, string>> = {
	start: 'cf:items-start',
	center: 'cf:items-center',
	end: 'cf:items-end',
	stretch: 'cf:items-stretch',
	baseline: 'cf:items-baseline',
};

export const JUSTIFY_CLASS: Readonly<Record<Justify, string>> = {
	start: 'cf:justify-start',
	center: 'cf:justify-center',
	end: 'cf:justify-end',
	between: 'cf:justify-between',
};
