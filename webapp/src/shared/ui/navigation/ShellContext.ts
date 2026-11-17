import { createContext, use } from 'react';

/**
 * ShellContext lets navigation items close the mobile drawer after a page is chosen.
 */
export const ShellContext = createContext<{ readonly closeDrawer: () => void }>({ closeDrawer: () => undefined });

/**
 * useShell returns the shell's navigation controls.
 */
export function useShell(): { readonly closeDrawer: () => void } {
	return use(ShellContext);
}
