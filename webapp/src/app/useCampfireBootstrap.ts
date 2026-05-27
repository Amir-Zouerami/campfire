import { useEffect, useState } from 'react';

import type { HealthResponse, MeResponse } from '@/types/api';
import type { Workspace, WorkspaceCapabilities } from '@/types/domain';
import { ApiClientError, getHealth, getMe, getWorkspaceByChannel } from '@/api';

import { getMattermostHostContext, isWorkspaceEligibleChannelType } from './mattermostHost';

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
	readonly channelID: string | null;
	readonly channelName: string | null;
	readonly teamID: string;
	readonly workspace: Workspace | null;
	readonly capabilities: WorkspaceCapabilities | null;
	readonly workspaceNotice: string | null;
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
export function useCampfireBootstrap(isOpen: boolean, refreshToken: number): BootstrapStatus {
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
				const hostContext = getMattermostHostContext();
				const teamID = hostContext.teamID ?? '';

				if (hostContext.channelID !== null && !isWorkspaceEligibleChannelType(hostContext.channelType)) {
					if (!isActive) {
						return;
					}

					setStatus({
						state: 'ready',
						health,
						me,
						channelID: null,
						channelName: hostContext.channelName,
						teamID,
						workspace: null,
						capabilities: null,
						workspaceNotice:
							'⚠️ Campfire workspaces can only be set up from channels or group conversations. Direct messages cannot become Campfire workspaces.',
					});

					return;
				}

				if (hostContext.channelID === null) {
					if (!isActive) {
						return;
					}

					setStatus({
						state: 'ready',
						health,
						me,
						channelID: null,
						channelName: null,
						teamID,
						workspace: null,
						capabilities: null,
						workspaceNotice: 'Open Campfire from a Mattermost channel to load or create a workspace.',
					});

					return;
				}

				const workspaceResult = await loadWorkspaceForChannel(hostContext.channelID);

				if (!isActive) {
					return;
				}

				setStatus({
					state: 'ready',
					health,
					me,
					channelID: hostContext.channelID,
					channelName: hostContext.channelName,
					teamID,
					workspace: workspaceResult.workspace,
					capabilities: workspaceResult.capabilities,
					workspaceNotice: workspaceResult.notice,
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
	}, [isOpen, refreshToken]);

	return status;
}

/**
 * WorkspaceLoadResult describes the current-channel workspace load result.
 */
type WorkspaceLoadResult = {
	readonly workspace: Workspace | null;
	readonly capabilities: WorkspaceCapabilities | null;
	readonly notice: string | null;
};

/**
 * loadWorkspaceForChannel loads the configured workspace for a channel.
 *
 * A 404 here is not fatal. It means this Mattermost channel does not have a
 * Campfire workspace yet, so the UI should show the workspace setup wizard.
 */
async function loadWorkspaceForChannel(channelID: string): Promise<WorkspaceLoadResult> {
	try {
		const response = await getWorkspaceByChannel(channelID);

		return {
			workspace: response.workspace,
			capabilities: response.capabilities,
			notice: null,
		};
	} catch (error: unknown) {
		if (isWorkspaceNotConfiguredError(error)) {
			return {
				workspace: null,
				capabilities: null,
				notice: '⚠️ Campfire is not configured for this channel yet.',
			};
		}

		throw error;
	}
}

/**
 * isWorkspaceNotConfiguredError returns true when the current channel has no workspace.
 */
function isWorkspaceNotConfiguredError(error: unknown): boolean {
	if (!(error instanceof ApiClientError)) {
		return false;
	}

	return error.status === 404 || error.code === 'workspace_not_configured' || error.code === 'not_found';
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
