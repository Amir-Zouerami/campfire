import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getDataRetentionPreview, purgeWorkspaceData } from '@/api';
import { toast } from '@/components/campfire/campfire-toast';
import { useI18n } from '@/i18n';
import { campfireQueryKeys } from '@/query';
import type { DataRetentionSummary } from '@/types/api';
import type { Workspace } from '@/types/domain';

import { defaultRetentionCutoffDate, errorToMessage, hasPurgeableRows } from './data-management.helpers';
import type { DataManagementFeedbackTone } from './data-management.types';

/**
 * UseDataManagementInput contains workspace and permission context.
 */
type UseDataManagementInput = {
	readonly workspace: Workspace;
	readonly canManageWorkspace: boolean;
	readonly onDataPurged: () => void;
};

/**
 * UseDataManagementResult contains data-retention preview and purge actions.
 */
export type UseDataManagementResult = {
	readonly cutoffDate: string;
	readonly previewCutoffDate: string;
	readonly summary: DataRetentionSummary | undefined;
	readonly message: string;
	readonly messageTone: DataManagementFeedbackTone;
	readonly isPreviewLoading: boolean;
	readonly isPurgeBusy: boolean;
	readonly canPurge: boolean;
	readonly setCutoffDate: (cutoffDate: string) => void;
	readonly preview: () => void;
	readonly purge: () => Promise<void>;
};

/**
 * useDataManagement owns the high-risk retention preview/purge workflow.
 */
export function useDataManagement(input: UseDataManagementInput): UseDataManagementResult {
	const { t } = useI18n();
	const queryClient = useQueryClient();
	const [cutoffDate, setCutoffDate] = useState(defaultRetentionCutoffDate);
	const [previewCutoffDate, setPreviewCutoffDate] = useState('');
	const [previewRefreshToken, setPreviewRefreshToken] = useState(0);
	const [feedback, setFeedback] = useState<{
		readonly message: string;
		readonly tone: DataManagementFeedbackTone;
	}>({ message: '', tone: 'success' });

	const previewQueryKey = campfireQueryKeys.dataRetentionPreview(
		input.workspace.id,
		previewCutoffDate,
		previewRefreshToken,
	);
	const collectionQueryKey = campfireQueryKeys.dataRetention(input.workspace.id);

	const previewQuery = useQuery({
		queryKey: previewQueryKey,
		queryFn: () => getDataRetentionPreview(input.workspace.id, previewCutoffDate),
		enabled: previewCutoffDate.trim() !== '' && input.canManageWorkspace,
		staleTime: 0,
	});

	const purgeMutation = useMutation({
		mutationFn: async () => {
			return purgeWorkspaceData(input.workspace.id, {
				cutoffDate: previewCutoffDate,
			});
		},
		onSuccess: response => {
			const message = t('settings.dataManagement.success.deleted', { count: response.summary.totalRows });
			setFeedback({ message, tone: 'success' });
			toast.success(t('settings.dataManagement.toast.deleted'));
			void queryClient.invalidateQueries({ queryKey: collectionQueryKey });
			void queryClient.invalidateQueries({ queryKey: campfireQueryKeys.workspace(input.workspace.id) });
			setPreviewRefreshToken(current => current + 1);
			input.onDataPurged();
		},
		onError: error => {
			const message = errorToMessage(error, t);
			setFeedback({ message, tone: 'error' });
			toast.error(message);
		},
	});

	const summary = previewQuery.data?.summary;
	const message = useMemo(() => {
		if (previewQuery.isError) {
			return errorToMessage(previewQuery.error, t);
		}

		return feedback.message;
	}, [feedback.message, previewQuery.error, previewQuery.isError]);
	const messageTone = previewQuery.isError ? 'error' : feedback.tone;
	const canPurge = input.canManageWorkspace && hasPurgeableRows(summary) && !purgeMutation.isPending;

	/**
	 * preview loads a fresh count summary for the selected cutoff date.
	 */
	function preview(): void {
		if (!input.canManageWorkspace) {
			setFeedback({ message: t('settings.dataManagement.error.permission'), tone: 'error' });
			return;
		}

		if (cutoffDate.trim() === '') {
			setFeedback({ message: t('settings.dataManagement.error.cutoffRequired'), tone: 'error' });
			return;
		}

		setFeedback({ message: '', tone: 'success' });
		setPreviewCutoffDate(cutoffDate);
		setPreviewRefreshToken(current => current + 1);
	}

	/**
	 * purge runs the irreversible server-side cleanup after confirmation.
	 */
	async function purge(): Promise<void> {
		if (!canPurge) {
			return;
		}

		await purgeMutation.mutateAsync().catch(() => undefined);
	}

	return {
		cutoffDate,
		previewCutoffDate,
		summary,
		message,
		messageTone,
		isPreviewLoading: previewQuery.isLoading || previewQuery.isFetching,
		isPurgeBusy: purgeMutation.isPending,
		canPurge,
		setCutoffDate,
		preview,
		purge,
	};
}
