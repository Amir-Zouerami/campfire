import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { createGlobalSkipDate, deleteGlobalSkipDate, listGlobalSkipDates } from '@/api';
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
 * useGlobalOffDays owns global skip-date loading and mutations.
 */
export function useGlobalOffDays(input: UseGlobalOffDaysInput): UseGlobalOffDaysResult {
	const [loadState, setLoadState] = useState<GlobalOffDaysLoadState>('idle');
	const [skipDates, setSkipDates] = useState<readonly GlobalSkipDate[]>([]);
	const [draft, setDraft] = useState<GlobalOffDayDraft>(emptyGlobalOffDayDraft);
	const [deletingID, setDeletingID] = useState('');
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * loadSkipDates loads global Campfire skip dates.
		 */
		async function loadSkipDates(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const response = await listGlobalSkipDates();

				if (!isActive) {
					return;
				}

				setSkipDates(response.skipDates);
				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setMessage(errorToMessage(error));
				setLoadState('error');
			}
		}

		void loadSkipDates();

		return () => {
			isActive = false;
		};
	}, []);

	const sortedSkipDates = useMemo(() => sortGlobalOffDays(skipDates), [skipDates]);
	const upcomingCount = useMemo(() => upcomingGlobalOffDayCount(skipDates), [skipDates]);
	const isBusy = loadState === 'loading' || loadState === 'saving' || loadState === 'deleting';

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
			setLoadState('error');
			setMessage('Only system admins can manage global off-days.');
			return;
		}

		const cleanDate = draft.date.trim();
		const cleanLabel = draft.label.trim();

		if (cleanDate === '') {
			setLoadState('error');
			setMessage('Global off-day date is required.');
			return;
		}

		if (cleanLabel === '') {
			setLoadState('error');
			setMessage('Global off-day label is required.');
			return;
		}

		setLoadState('saving');
		setMessage('');

		try {
			const response = await createGlobalSkipDate({
				date: cleanDate,
				label: cleanLabel,
			});

			setSkipDates(current => [...current, response.skipDate]);
			setDraft(emptyGlobalOffDayDraft());
			setLoadState('ready');
			setMessage('Global off-day added.');
			toast.success('Global off-day added');
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);

			setLoadState('error');
			setMessage(errorMessage);
			toast.error(errorMessage);
		}
	}

	/**
	 * deleteOffDay deletes one global Campfire skip date.
	 */
	async function deleteOffDay(skipDateID: string): Promise<void> {
		if (!input.isSystemAdmin) {
			setLoadState('error');
			setMessage('Only system admins can delete global off-days.');
			return;
		}

		setLoadState('deleting');
		setDeletingID(skipDateID);
		setMessage('');

		try {
			await deleteGlobalSkipDate(skipDateID);

			setSkipDates(current => current.filter(skipDate => skipDate.id !== skipDateID));
			setDeletingID('');
			setLoadState('ready');
			setMessage('Global off-day deleted.');
			toast.success('Global off-day deleted');
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);

			setDeletingID('');
			setLoadState('error');
			setMessage(errorMessage);
			toast.error(errorMessage);
		}
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
