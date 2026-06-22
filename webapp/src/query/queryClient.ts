import { QueryClient } from '@tanstack/react-query';

/**
 * createCampfireQueryClient builds the shared frontend cache client.
 *
 * Mattermost plugin modals are short-lived and event-driven, so Campfire keeps
 * window-focus refetches off and uses explicit invalidation/refetch actions for
 * predictable UX inside the host application.
 */
export function createCampfireQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				gcTime: 10 * 60 * 1000,
				retry: false,
				refetchOnMount: true,
				refetchOnReconnect: true,
				refetchOnWindowFocus: false,
				staleTime: 30 * 1000,
			},
			mutations: {
				retry: false,
			},
		},
	});
}
