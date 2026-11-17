import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { createQueryClient } from '@/shared/query/queryClient';

import { CampfireWindow } from './CampfireWindow';
import { useOpenSession } from './useOpenSession';

/**
 * CampfireRoot is the component registered with Mattermost's `registerRootComponent`.
 * It renders nothing until Campfire is opened from the channel header or the App Bar.
 */
export function CampfireRoot(): ReactElement {
	// One cache for the lifetime of the plugin, so reopening Campfire is instant.
	const [queryClient] = useState(createQueryClient);
	const { context, close } = useOpenSession();

	return (
		<QueryClientProvider client={queryClient}>
			{context !== null && <CampfireWindow context={context} onClose={close} />}
		</QueryClientProvider>
	);
}
