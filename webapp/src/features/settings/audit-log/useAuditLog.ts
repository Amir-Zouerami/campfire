import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { listAuditLog } from '@/api';
import { useI18n } from '@/i18n';
import { campfireQueryKeys } from '@/query';
import type { AuditLogEntry, Workspace } from '@/types/domain';

import { collectAuditActorUserIDs, countAuditActions, errorToMessage } from './audit-log.helpers';
import type { AuditActionCount, AuditLimitOption, AuditLogLoadState } from './audit-log.types';

/**
 * UseAuditLogInput contains workspace context.
 */
type UseAuditLogInput = {
	readonly workspace: Workspace;
};

/**
 * UseAuditLogResult contains audit-log state and actions.
 */
export type UseAuditLogResult = {
	readonly loadState: AuditLogLoadState;
	readonly limit: AuditLimitOption;
	readonly entries: readonly AuditLogEntry[];
	readonly actionCounts: readonly AuditActionCount[];
	readonly actorUserIDs: readonly string[];
	readonly message: string;
	readonly isBusy: boolean;
	readonly setLimit: (limit: AuditLimitOption) => void;
	readonly reload: () => Promise<void>;
};

/**
 * useAuditLog owns audit-log query state and limit controls.
 */
export function useAuditLog(input: UseAuditLogInput): UseAuditLogResult {
	const { t } = useI18n();
	const [limit, setLimit] = useState<AuditLimitOption>(50);
	const [refreshToken, setRefreshToken] = useState(0);
	const query = useQuery({
		queryKey: campfireQueryKeys.auditLog(input.workspace.id, limit, refreshToken),
		queryFn: () => listAuditLog(input.workspace.id, limit),
		enabled: input.workspace.id.trim() !== '',
	});

	const entries = query.data?.entries ?? [];
	const actionCounts = useMemo(() => countAuditActions(entries), [entries]);
	const actorUserIDs = useMemo(() => collectAuditActorUserIDs(entries), [entries]);
	const loadState = deriveAuditLogLoadState(query.isLoading || query.isFetching, query.isError);
	const message = query.isError ? errorToMessage(query.error, t) : '';

	/**
	 * reload reloads audit entries with the current limit.
	 */
	async function reload(): Promise<void> {
		setRefreshToken(current => current + 1);
		await query.refetch();
	}

	return {
		loadState,
		limit,
		entries,
		actionCounts,
		actorUserIDs,
		message,
		isBusy: query.isLoading || query.isFetching,
		setLimit,
		reload,
	};
}

/**
 * deriveAuditLogLoadState keeps page rendering independent from query internals.
 */
function deriveAuditLogLoadState(isLoading: boolean, isError: boolean): AuditLogLoadState {
	if (isLoading) {
		return 'loading';
	}

	if (isError) {
		return 'error';
	}

	return 'ready';
}
