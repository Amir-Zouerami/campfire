import { QueryClient } from '@tanstack/react-query';

/**
 * createQueryClient builds the shared server-state cache.
 *
 * Campfire lives in a modal inside Mattermost, so window-focus refetching is off and data
 * is refreshed by explicit invalidation after mutations. Failed requests are not retried:
 * the HTTP client already reports them once, and retries would only delay the error state.
 */
export function createQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				gcTime: 10 * 60 * 1000,
				staleTime: 30 * 1000,
				retry: false,
				refetchOnWindowFocus: false,
			},
			mutations: { retry: false },
		},
	});
}
