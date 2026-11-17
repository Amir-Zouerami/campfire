import { createContext, use } from 'react';
import type { ReactElement, ReactNode } from 'react';

/**
 * PortalContainer is the element every popup (dialog, calendar, combobox list) renders into.
 *
 * Popups must live inside Campfire's own `.cf-root` element, not `document.body`, so they
 * inherit its fonts, text direction and design tokens, and never leak into Mattermost's DOM.
 */
const PortalContainerContext = createContext<HTMLElement | null>(null);

/**
 * PortalContainerProvider publishes the popup container to the subtree.
 */
export function PortalContainerProvider(props: { readonly container: HTMLElement | null; readonly children: ReactNode }): ReactElement {
	return <PortalContainerContext value={props.container}>{props.children}</PortalContainerContext>;
}

/**
 * usePortalContainer returns the element popups should portal into.
 */
export function usePortalContainer(): HTMLElement | null {
	return use(PortalContainerContext);
}
