import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createGlobalSkipDate, deleteGlobalSkipDate, listGlobalSkipDates } from '@/api';
import { toast } from '@/components/campfire/campfire-toast';
import { useI18n } from '@/i18n';
import { campfireQueryKeys } from '@/query';
import type { ListGlobalSkipDatesResponse } from '@/types/api';
import type { GlobalSkipDate } from '@/types/domain';

import {
	emptyGlobalOffDayDraft,
	errorToMessage,
	sortGlobalOffDays,
	upcomingGlobalOffDayCount,
} from './global-off-days.helpers';
import type { GlobalOffDayDraft, GlobalOffDayDraftPatch, GlobalOffDaysLoadState } from './global-off-days.types';

/**
 * UseGlobalOffDaysInput contains global off-day access state.
 */
type UseGlobalOffDaysInput = {
	readonly isSystemAdmin: boolean;
};

/**
 * UseGlobalOffDaysResult contains global off-day state and actions.
 */
export type UseGlobalOffDaysResult = {
	readonly loadState: GlobalOffDaysLoadState;
	readonly skipDates: readonly GlobalSkipDate[];
	readonly sortedSkipDates: readonly GlobalSkipDate[];
	readonly draft: GlobalOffDayDraft;
	readonly deletingID: string;
	readonly message: string;
	readonly isBusy: boolean;
	readonly upcomingCount: number;
	readonly updateDraft: (patch: GlobalOffDayDraftPatch) => void;
	readonly createOffDay: () => Promise<void>;
	readonly deleteOffDay: (skipDateID: string) => Promise<void>;
};

/**
 * useGlobalOffDays owns global skip-date query state and mutations.
 */
export function useGlobalOffDays(input: UseGlobalOffDaysInput): UseGlobalOffDaysResult {
	const { t } = useI18n();
	const queryClient = useQueryClient();
	const queryKey = campfireQueryKeys.globalOffDays();
	const [draft, setDraft] = useState<GlobalOffDayDraft>(emptyGlobalOffDayDraft);
	const [deletingID, setDeletingID] = useState('');
	const [feedback, setFeedback] = useState('');

	const offDaysQuery = useQuery({
		queryKey,
		queryFn: listGlobalSkipDates,
	});

	const createMutation = useMutation({
		mutationFn: async (value: GlobalOffDayDraft) => {
			return createGlobalSkipDate({
				date: value.date.trim(),
				label: value.label.trim(),
			});
		},
		onSuccess: response => {
			queryClient.setQueryData<ListGlobalSkipDatesResponse>(queryKey, current => {
				const currentSkipDates = current?.skipDates ?? [];

				return {
					skipDates: [...currentSkipDates, response.skipDate],
				};
			});
			setDraft(emptyGlobalOffDayDraft());
			setFeedback(t('settings.globalOffDays.toast.created'));
			toast.success(t('settings.globalOffDays.toast.created'));
		},
		onError: error => {
			const message = errorToMessage(error, t);
			setFeedback(message);
			toast.error(message);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (skipDateID: string) => {
			setDeletingID(skipDateID);
			await deleteGlobalSkipDate(skipDateID);

			return skipDateID;
		},
		onSuccess: skipDateID => {
			queryClient.setQueryData<ListGlobalSkipDatesResponse>(queryKey, current => ({
				skipDates: (current?.skipDates ?? []).filter(skipDate => skipDate.id !== skipDateID),
			}));
			setFeedback(t('settings.globalOffDays.toast.deleted'));
			toast.success(t('settings.globalOffDays.toast.deleted'));
		},
		onError: error => {
			const message = errorToMessage(error, t);
			setFeedback(message);
			toast.error(message);
		},
		onSettled: () => {
			setDeletingID('');
		},
	});

	const skipDates = offDaysQuery.data?.skipDates ?? [];
	const sortedSkipDates = useMemo(() => sortGlobalOffDays(skipDates), [skipDates]);
	const upcomingCount = useMemo(() => upcomingGlobalOffDayCount(skipDates), [skipDates]);
	const isBusy = offDaysQuery.isLoading || createMutation.isPending || deleteMutation.isPending;
	const loadState = deriveGlobalOffDaysLoadState(
		offDaysQuery.isLoading,
		offDaysQuery.isError,
		createMutation.isPending,
		deleteMutation.isPending,
	);
	const message = offDaysQuery.isError ? errorToMessage(offDaysQuery.error, t) : feedback;

	/**
	 * updateDraft patches the create off-day form.
	 */
	function updateDraft(patch: GlobalOffDayDraftPatch): void {
		setDraft(current => ({
			...current,
			...patch,
		}));
	}

	/**
	 * createOffDay creates a global Campfire skip date.
	 */
	async function createOffDay(): Promise<void> {
		if (!input.isSystemAdmin) {
			setFeedback(t('settings.globalOffDays.error.permission.manage'));
			return;
		}

		const cleanDate = draft.date.trim();
		const cleanLabel = draft.label.trim();

		if (cleanDate === '') {
			setFeedback(t('settings.globalOffDays.error.dateRequired'));
			return;
		}

		if (cleanLabel === '') {
			setFeedback(t('settings.globalOffDays.error.labelRequired'));
			return;
		}

		setFeedback('');
		await createMutation.mutateAsync({ date: cleanDate, label: cleanLabel }).catch(() => undefined);
	}

	/**
	 * deleteOffDay deletes one global Campfire skip date.
	 */
	async function deleteOffDay(skipDateID: string): Promise<void> {
		if (!input.isSystemAdmin) {
			setFeedback(t('settings.globalOffDays.error.permission.delete'));
			return;
		}

		setFeedback('');
		await deleteMutation.mutateAsync(skipDateID).catch(() => undefined);
	}

	return {
		loadState,
		skipDates,
		sortedSkipDates,
		draft,
		deletingID,
		message,
		isBusy,
		upcomingCount,
		updateDraft,
		createOffDay,
		deleteOffDay,
	};
}

/**
 * deriveGlobalOffDaysLoadState keeps rendering independent from TanStack internals.
 */
function deriveGlobalOffDaysLoadState(
	isLoading: boolean,
	isError: boolean,
	isCreating: boolean,
	isDeleting: boolean,
): GlobalOffDaysLoadState {
	if (isLoading) {
		return 'loading';
	}

	if (isCreating) {
		return 'saving';
	}

	if (isDeleting) {
		return 'deleting';
	}

	if (isError) {
		return 'error';
	}

	return 'ready';
}
