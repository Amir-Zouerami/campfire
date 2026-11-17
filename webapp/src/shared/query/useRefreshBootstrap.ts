import { useQueryClient } from '@tanstack/react-query';

import { BOOTSTRAP_KEY } from './keys';

/**
 * useRefreshBootstrap returns a function that re-reads the workspace and the user's
 * capabilities. Call it after changing workspace-level settings (timezone, language, roles).
 */
export function useRefreshBootstrap(): () => Promise<void> {
	const queryClient = useQueryClient();

	return () => queryClient.invalidateQueries({ queryKey: BOOTSTRAP_KEY });
}
