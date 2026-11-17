import { createContext, use } from 'react';
import type { ReactElement, ReactNode } from 'react';

import type { SavedReportFilter } from '@/shared/types/domain';

/**
 * Area is a top-level section of the sidebar. It also selects the page accent colour.
 */
export type Area = 'my-day' | 'team' | 'reports' | 'settings';

/**
 * PageId identifies one page of the application. Every page is a single task: there are no
 * nested tabs, so a page id is also a complete address.
 */
export type PageId =
	| 'my-day.standup'
	| 'my-day.tasks'
	| 'my-day.time'
	| 'my-day.leave'
	| 'team.standups'
	| 'team.availability'
	| 'team.approvals'
	| 'team.runtime'
	| 'reports.daily'
	| 'reports.weekly'
	| 'reports.time'
	| 'reports.csv'
	| 'reports.saved'
	| 'reports.global'
	| 'settings.overview'
	| 'settings.roles'
	| 'settings.calendar'
	| 'settings.standup-forms'
	| 'settings.reminders'
	| 'settings.report-rules'
	| 'settings.audit'
	| 'settings.data'
	| 'settings.global-off-days';

/**
 * areaOf returns the area a page belongs to.
 */
export function areaOf(page: PageId): Area {
	return page.slice(0, page.indexOf('.')) as Area;
}

/**
 * NavigationParams carry optional context into the destination page.
 */
export type NavigationParams = {
	/** A saved report filter to apply on the destination report page. */
	readonly filter?: SavedReportFilter;
};

/**
 * NavigationValue is the current page and the way to change it.
 */
export type NavigationValue = {
	readonly page: PageId;
	readonly params: NavigationParams | undefined;
	readonly navigate: (page: PageId, params?: NavigationParams) => void;
};

const NavigationContext = createContext<NavigationValue | null>(null);

/**
 * NavigationProvider publishes the navigation state.
 */
export function NavigationProvider(props: { readonly value: NavigationValue; readonly children: ReactNode }): ReactElement {
	return <NavigationContext value={props.value}>{props.children}</NavigationContext>;
}

/**
 * useNavigation returns the current page and the navigate function.
 */
export function useNavigation(): NavigationValue {
	const navigation = use(NavigationContext);
	if (navigation === null) {
		throw new Error('useNavigation must be used inside a NavigationProvider.');
	}

	return navigation;
}
