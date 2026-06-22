import type { ReactElement, ReactNode } from 'react';
import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

import { createCampfireQueryClient } from './queryClient';

/**
 * CampfireQueryProvider owns the TanStack Query client lifecycle.
 *
 * The client is created once per Mattermost root-component mount so Campfire can
 * share cache state across pages without leaking cache state into Mattermost or
 * other plugins.
 */
export function CampfireQueryProvider(props: { readonly children: ReactNode }): ReactElement {
	const [queryClient] = useState(createCampfireQueryClient);

	return <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>;
}
