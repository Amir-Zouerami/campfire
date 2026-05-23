import { Flame, Timer, Umbrella } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

import { DEFAULT_MY_DAY_SECTION, myDaySections } from './my-day.sections';
import type { MyDaySection, MyDaySectionID } from './my-day.types';

/**
 * resolveMyDaySection returns a valid section for the requested ID.
 */
export function resolveMyDaySection(sectionID: MyDaySectionID): MyDaySection {
	return myDaySections.find(section => section.id === sectionID) ?? DEFAULT_MY_DAY_SECTION;
}

/**
 * iconForMyDaySection returns the visual icon for a My Day section.
 */
export function iconForMyDaySection(sectionID: MyDaySectionID): LucideIcon {
	switch (sectionID) {
		case 'check-in':
			return Flame;

		case 'time-log':
			return Timer;

		case 'leave':
			return Umbrella;
	}
}

/**
 * myDaySectionButtonClassName returns the style for a My Day section button.
 */
export function myDaySectionButtonClassName(active: boolean): string {
	return cn(
		'cf:flex cf:min-h-[112px] cf:items-center cf:gap-4 cf:rounded-2xl cf:border cf:px-5 cf:py-5 cf:text-left cf:transition',
		'cf:cursor-pointer cf:border-white/10 cf:bg-white/[0.045] hover:cf:border-amber-300/35 hover:cf:bg-amber-300/[0.065]',
		active && 'cf:border-amber-300/45 cf:bg-amber-300/[0.115] cf:shadow-xl',
	);
}

/**
 * myDaySectionIconClassName returns the icon tile style for a My Day section button.
 */
export function myDaySectionIconClassName(active: boolean): string {
	return cn(
		'cf:flex cf:size-14 cf:shrink-0 cf:items-center cf:justify-center cf:rounded-2xl cf:border cf:transition',
		'cf:border-white/10 cf:bg-black/20 cf:text-amber-100',
		active && 'cf:border-amber-300/35 cf:bg-amber-300/15 cf:text-amber-50',
	);
}

/**
 * formatTodayLabel returns a readable current date label.
 */
export function formatTodayLabel(): string {
	return new Intl.DateTimeFormat(undefined, {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
	}).format(new Date());
}
