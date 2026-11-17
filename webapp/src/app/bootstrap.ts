import { useQuery } from '@tanstack/react-query';

import { ApiClientError, getHealth, getMe, getWorkspaceByChannel } from '@/shared/api';
import type { HealthResponse, MeResponse } from '@/shared/types/api';
import type { Workspace, WorkspaceCapabilities } from '@/shared/types/domain';

import { BOOTSTRAP_KEY } from '@/shared/query/keys';
import { isWorkspaceEligibleChannelType } from '@/shared/host/hostContext';
import type { HostContext } from '@/shared/host/hostContext';

/**
 * BootstrapNotice explains why no workspace is shown. It is a code, not text, so the UI
 * can translate it into the user's language.
 */
export type BootstrapNotice = 'no-channel' | 'direct-message' | 'not-configured';

/**
 * Bootstrap is everything Campfire needs to know before it can render a page.
 */
export type Bootstrap = {
	readonly health: HealthResponse;
	readonly me: MeResponse;
	readonly channelID: string | null;
	readonly channelName: string | null;
	readonly teamID: string;
	readonly workspace: Workspace | null;
	readonly capabilities: WorkspaceCapabilities | null;
	readonly notice: BootstrapNotice | null;
};

/**
 * bootstrapKey identifies the bootstrap data for one Mattermost location.
 */
export function bootstrapKey(context: HostContext): readonly unknown[] {
	return [...BOOTSTRAP_KEY, context.channelID, context.teamID];
}

/**
 * useBootstrap loads the signed-in user and the workspace for the channel Campfire was opened in.
 */
export function useBootstrap(context: HostContext): ReturnType<typeof useQuery<Bootstrap>> {
	return useQuery({
		queryKey: bootstrapKey(context),
		queryFn: () => loadBootstrap(context),
		staleTime: 0,
		refetchOnMount: 'always',
	});
}

/**
 * loadBootstrap loads health, the current user and the channel's workspace.
 * The three requests are independent, so they run in parallel: opening Campfire costs one
 * network round trip instead of two.
 */
async function loadBootstrap(context: HostContext): Promise<Bootstrap> {
	const channelID = context.channelID !== null && isWorkspaceEligibleChannelType(context.channelType) ? context.channelID : null;

	const [health, me, lookup] = await Promise.all([getHealth(), getMe(), channelID === null ? null : lookUpWorkspace(channelID)]);
	const base = { health, me, channelName: context.channelName, teamID: context.teamID ?? '', workspace: null, capabilities: null } as const;

	if (context.channelID === null) {
		return { ...base, channelID: null, channelName: null, notice: 'no-channel' };
	}

	if (lookup === null) {
		return { ...base, channelID: null, notice: 'direct-message' };
	}

	if (lookup === 'not-configured') {
		return { ...base, channelID: context.channelID, notice: 'not-configured' };
	}

	return { ...base, channelID: context.channelID, workspace: lookup.workspace, capabilities: lookup.capabilities, notice: null };
}

/**
 * lookUpWorkspace finds the workspace of a channel. A missing workspace is the normal
 * first-run state, not a failure, so it is returned as a value and leads to the setup flow.
 */
async function lookUpWorkspace(channelID: string): Promise<Awaited<ReturnType<typeof getWorkspaceByChannel>> | 'not-configured'> {
	try {
		return await getWorkspaceByChannel(channelID);
	} catch (error: unknown) {
		if (error instanceof ApiClientError && error.isNotFound) {
			return 'not-configured';
		}

		throw error;
	}
}
