import { useQuery } from '@tanstack/react-query';

import type { HealthResponse, MeResponse } from '@/types/api';
import type { Workspace, WorkspaceCapabilities } from '@/types/domain';
import { ApiClientError, getHealth, getMe, getWorkspaceByChannel } from '@/api';
import { campfireQueryKeys } from '@/query';

import { isWorkspaceEligibleChannelType } from './mattermostHost';

/**
 * CampfireBootstrapOpenContext is the Mattermost location snapshot captured when the modal opens.
 */
export type CampfireBootstrapOpenContext = {
	readonly openSequence: number;
	readonly channelID: string | null;
	readonly channelName: string | null;
	readonly channelType: string | null;
	readonly teamID: string | null;
};

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
 * useCampfireBootstrap loads startup data for the exact channel snapshot that opened the modal.
 *
 * Mattermost keeps the plugin root mounted while users move between channels, so bootstrap data
 * must be keyed by an explicit open-session context instead of the ambient current channel alone.
 */
export function useCampfireBootstrap(
	isOpen: boolean,
	openContext: CampfireBootstrapOpenContext | null,
	refreshToken: number,
): BootstrapStatus {
	const bootstrapQuery = useQuery({
		queryKey: campfireQueryKeys.bootstrap(
			openContext?.openSequence ?? 0,
			openContext?.channelID ?? null,
			openContext?.channelType ?? null,
			openContext?.teamID ?? null,
			refreshToken,
		),
		queryFn: async () => {
			if (openContext === null) {
				throw new Error('Campfire open context is missing.');
			}

			return loadBootstrapData(openContext);
		},
		enabled: isOpen && openContext !== null,
	});

	if (!isOpen) {
		return {
			state: 'idle',
		};
	}

	if (openContext === null) {
		return {
			state: 'loading',
		};
	}

	if (bootstrapQuery.data !== undefined) {
		return bootstrapQuery.data;
	}

	if (bootstrapQuery.isError) {
		return {
			state: 'error',
			errorMessage: getErrorMessage(bootstrapQuery.error),
		};
	}

	return {
		state: 'loading',
	};
}

/**
 * loadBootstrapData loads health, current user, and the workspace for the captured open context.
 */
async function loadBootstrapData(openContext: CampfireBootstrapOpenContext): Promise<BootstrapReadyStatus> {
	const [health, me] = await Promise.all([getHealth(), getMe()]);
	const teamID = openContext.teamID ?? '';

	if (openContext.channelID !== null && !isWorkspaceEligibleChannelType(openContext.channelType)) {
		return {
			state: 'ready',
			health,
			me,
			channelID: null,
			channelName: openContext.channelName,
			teamID,
			workspace: null,
			capabilities: null,
			workspaceNotice:
				'⚠️ Campfire workspaces can only be set up from channels or group conversations. Direct messages cannot become Campfire workspaces.',
		};
	}

	if (openContext.channelID === null) {
		return {
			state: 'ready',
			health,
			me,
			channelID: null,
			channelName: null,
			teamID,
			workspace: null,
			capabilities: null,
			workspaceNotice: 'Open Campfire from a Mattermost channel to load or create a workspace.',
		};
	}

	const workspaceResult = await loadWorkspaceForChannel(openContext.channelID);

	return {
		state: 'ready',
		health,
		me,
		channelID: openContext.channelID,
		channelName: openContext.channelName,
		teamID,
		workspace: workspaceResult.workspace,
		capabilities: workspaceResult.capabilities,
		workspaceNotice: workspaceResult.notice,
	};
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
