import { useEffect, useState } from 'react';

import { ApiClientError, getHealth, getMe } from '../api/client';
import type { HealthResponse, MeResponse } from '../types/api';

/**
 * BootstrapIdleStatus means Campfire has not started loading startup data yet.
 */
export type BootstrapIdleStatus = {
	readonly state: 'idle';
};

/**
 * BootstrapLoadingStatus means Campfire is loading startup data.
 */
export type BootstrapLoadingStatus = {
	readonly state: 'loading';
};

/**
 * BootstrapReadyStatus means Campfire loaded startup data successfully.
 */
export type BootstrapReadyStatus = {
	readonly state: 'ready';
	readonly health: HealthResponse;
	readonly me: MeResponse;
};

/**
 * BootstrapErrorStatus means Campfire failed to load startup data.
 */
export type BootstrapErrorStatus = {
	readonly state: 'error';
	readonly errorMessage: string;
};

/**
 * BootstrapStatus describes the first backend calls needed by the Campfire shell.
 */
export type BootstrapStatus =
	| BootstrapIdleStatus
	| BootstrapLoadingStatus
	| BootstrapReadyStatus
	| BootstrapErrorStatus;

/**
 * useCampfireBootstrap loads initial backend data when Campfire opens.
 */
export function useCampfireBootstrap(isOpen: boolean): BootstrapStatus {
	const [status, setStatus] = useState<BootstrapStatus>({
		state: 'idle',
	});

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		let isActive = true;

		async function loadBootstrapData(): Promise<void> {
			setStatus({
				state: 'loading',
			});

			try {
				const [health, me] = await Promise.all([getHealth(), getMe()]);

				if (!isActive) {
					return;
				}

				setStatus({
					state: 'ready',
					health,
					me,
				});
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setStatus({
					state: 'error',
					errorMessage: getErrorMessage(error),
				});
			}
		}

		void loadBootstrapData();

		return () => {
			isActive = false;
		};
	}, [isOpen]);

	return status;
}

/**
 * getErrorMessage converts unknown thrown values into a safe UI message.
 */
function getErrorMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return 'Campfire could not load its startup data.';
}
