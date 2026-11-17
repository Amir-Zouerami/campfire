import { createContext, use } from 'react';
import type { ReactElement, ReactNode } from 'react';

/**
 * UiSettings carries workspace-derived presentation choices that low-level controls
 * (date pickers, calendars) need without depending on the session layer.
 */
export type UiSettings = {
	/** Which alternate calendar to show beside Gregorian dates, if any. */
	readonly alternateCalendar: 'persian' | null;
	/** First day of the week, 0 (Sunday) to 6 (Saturday). */
	readonly weekStart: number;
};

const UiSettingsContext = createContext<UiSettings>({ alternateCalendar: null, weekStart: 1 });

/**
 * UiSettingsProvider supplies presentation settings to the subtree.
 */
export function UiSettingsProvider(props: { readonly value: UiSettings; readonly children: ReactNode }): ReactElement {
	return <UiSettingsContext value={props.value}>{props.children}</UiSettingsContext>;
}

/**
 * useUiSettings returns the current presentation settings.
 */
export function useUiSettings(): UiSettings {
	return use(UiSettingsContext);
}
