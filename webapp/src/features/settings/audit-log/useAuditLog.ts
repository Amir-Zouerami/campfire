import { useEffect, useMemo, useState } from 'react';

import { listAuditLog } from '@/api';
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
 * useAuditLog owns audit-log loading and limit controls.
 */
export function useAuditLog(input: UseAuditLogInput): UseAuditLogResult {
	const [loadState, setLoadState] = useState<AuditLogLoadState>('idle');
	const [limit, setLimit] = useState<AuditLimitOption>(50);
	const [entries, setEntries] = useState<readonly AuditLogEntry[]>([]);
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * loadEntries loads recent audit entries.
		 */
		async function loadEntries(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const response = await listAuditLog(input.workspace.id, limit);

				if (!isActive) {
					return;
				}

				setEntries(response.entries);
				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setMessage(errorToMessage(error));
				setLoadState('error');
			}
		}

		void loadEntries();

		return () => {
			isActive = false;
		};
	}, [input.workspace.id, limit]);

	const actionCounts = useMemo(() => countAuditActions(entries), [entries]);
	const actorUserIDs = useMemo(() => collectAuditActorUserIDs(entries), [entries]);

	/**
	 * reload reloads audit entries with the current limit.
	 */
	async function reload(): Promise<void> {
		setLoadState('loading');
		setMessage('');

		try {
			const response = await listAuditLog(input.workspace.id, limit);

			setEntries(response.entries);
			setLoadState('ready');
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	return {
		loadState,
		limit,
		entries,
		actionCounts,
		actorUserIDs,
		message,
		isBusy: loadState === 'loading',
		setLimit,
		reload,
	};
}
