import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
	createWorkspaceOffDay,
	deleteWorkspaceOffDay,
	listWorkspaceOffDays,
	listWorkspaceWorkingDays,
	updateWorkspaceWorkingDays,
} from '@/api';
import { toast } from '@/components/campfire/campfire-toast';
import { useI18n } from '@/i18n';
import { campfireQueryKeys } from '@/query';
import type { Workspace, WorkspaceOffDay, WorkspaceWorkingDay } from '@/types/domain';

import {
	emptyWorkspaceOffDayDraft,
	enabledWeekdaysFromWorkingDays,
	errorToMessage,
	sameWeekdays,
	selectedWeekdayLabel,
	sortWorkspaceOffDays,
	upcomingWorkspaceOffDayCount,
} from './working-calendar.helpers';
import type {
	WorkingCalendarFeedbackTone,
	WorkingCalendarLoadState,
	WorkspaceOffDayDraft,
	WorkspaceOffDayDraftPatch,
} from './working-calendar.types';

/**
 * WorkingCalendarSnapshot is the server-owned calendar state for one workspace.
 */
type WorkingCalendarSnapshot = {
	readonly workingDays: readonly WorkspaceWorkingDay[];
	readonly offDays: readonly WorkspaceOffDay[];
};

/**
 * UseWorkingCalendarInput contains workspace context and mutation callbacks.
 */
type UseWorkingCalendarInput = {
	readonly workspace: Workspace;
	readonly canManageCalendar: boolean;
	readonly refreshToken: number;
	readonly onCalendarChanged: () => void;
};

/**
 * UseWorkingCalendarResult contains working calendar state and actions.
 */
export type UseWorkingCalendarResult = {
	readonly loadState: WorkingCalendarLoadState;
	readonly message: string;
	readonly messageTone: WorkingCalendarFeedbackTone;
	readonly workingDays: readonly WorkspaceWorkingDay[];
	readonly selectedWeekdays: readonly number[];
	readonly savedWeekdays: readonly number[];
	readonly offDays: readonly WorkspaceOffDay[];
	readonly sortedOffDays: readonly WorkspaceOffDay[];
	readonly offDayDraft: WorkspaceOffDayDraft;
	readonly deletingOffDayID: string;
	readonly isBusy: boolean;
	readonly changed: boolean;
	readonly selectedWeekdayLabel: string;
	readonly upcomingOffDayCount: number;
	readonly setSelectedWeekdays: (weekdays: readonly number[]) => void;
	readonly updateOffDayDraft: (patch: WorkspaceOffDayDraftPatch) => void;
	readonly saveWorkingDays: () => Promise<void>;
	readonly createOffDay: () => Promise<void>;
	readonly deleteOffDay: (offDayID: string) => Promise<void>;
};

/**
 * useWorkingCalendar owns local form draft state and delegates server state to TanStack Query.
 */
export function useWorkingCalendar(input: UseWorkingCalendarInput): UseWorkingCalendarResult {
	const { t } = useI18n();
	const queryClient = useQueryClient();
	const calendarQueryKey = campfireQueryKeys.workingCalendar(input.workspace.id, input.refreshToken);
	const calendarCollectionKey = campfireQueryKeys.workingCalendars(input.workspace.id);
	const [selectedWeekdays, setSelectedWeekdays] = useState<readonly number[]>([]);
	const [offDayDraft, setOffDayDraft] = useState<WorkspaceOffDayDraft>(emptyWorkspaceOffDayDraft);
	const [deletingOffDayID, setDeletingOffDayID] = useState('');
	const [feedback, setFeedback] = useState<{
		readonly message: string;
		readonly tone: WorkingCalendarFeedbackTone;
	}>({ message: '', tone: 'success' });

	const calendarQuery = useQuery({
		queryKey: calendarQueryKey,
		queryFn: () => loadWorkingCalendarSnapshot(input.workspace.id),
		enabled: input.workspace.id.trim() !== '',
		staleTime: 30_000,
	});

	const workingDays = calendarQuery.data?.workingDays ?? [];
	const offDays = calendarQuery.data?.offDays ?? [];

	useEffect(() => {
		if (calendarQuery.data === undefined) {
			return;
		}

		setSelectedWeekdays(enabledWeekdaysFromWorkingDays(calendarQuery.data.workingDays));
	}, [calendarQuery.data]);

	const saveWorkingDaysMutation = useMutation({
		mutationFn: async (weekdays: readonly number[]) => {
			return updateWorkspaceWorkingDays(input.workspace.id, {
				workingDays: [...weekdays],
			});
		},
		onSuccess: response => {
			const enabledWeekdays = enabledWeekdaysFromWorkingDays(response.workingDays);

			setSelectedWeekdays(enabledWeekdays);
			setFeedback({ message: t('settings.workingCalendar.toast.saved'), tone: 'success' });
			toast.success(t('settings.workingCalendar.toast.saved'));
			setWorkingCalendarSnapshot(queryClient, calendarQueryKey, current => ({
				workingDays: response.workingDays,
				offDays: current?.offDays ?? offDays,
			}));
			void queryClient.invalidateQueries({ queryKey: calendarCollectionKey });
			input.onCalendarChanged();
		},
		onError: error => {
			const errorMessage = errorToMessage(error, t);

			setFeedback({ message: errorMessage, tone: 'error' });
			toast.error(errorMessage);
		},
	});

	const createOffDayMutation = useMutation({
		mutationFn: async (draft: WorkspaceOffDayDraft) => {
			return createWorkspaceOffDay(input.workspace.id, {
				date: draft.date,
				label: draft.label.trim(),
			});
		},
		onSuccess: response => {
			setOffDayDraft(emptyWorkspaceOffDayDraft());
			setFeedback({ message: t('settings.workingCalendar.toast.offDayCreated'), tone: 'success' });
			toast.success(t('settings.workingCalendar.toast.offDayCreated'));
			setWorkingCalendarSnapshot(queryClient, calendarQueryKey, current => ({
				workingDays: current?.workingDays ?? workingDays,
				offDays: [...(current?.offDays ?? offDays), response.offDay],
			}));
			void queryClient.invalidateQueries({ queryKey: calendarCollectionKey });
			input.onCalendarChanged();
		},
		onError: error => {
			const errorMessage = errorToMessage(error, t);

			setFeedback({ message: errorMessage, tone: 'error' });
			toast.error(errorMessage);
		},
	});

	const deleteOffDayMutation = useMutation({
		mutationFn: async (offDayID: string) => {
			setDeletingOffDayID(offDayID);
			await deleteWorkspaceOffDay(input.workspace.id, offDayID);

			return offDayID;
		},
		onSuccess: offDayID => {
			setFeedback({ message: t('settings.workingCalendar.toast.offDayDeleted'), tone: 'success' });
			toast.success(t('settings.workingCalendar.toast.offDayDeleted'));
			setWorkingCalendarSnapshot(queryClient, calendarQueryKey, current => ({
				workingDays: current?.workingDays ?? workingDays,
				offDays: (current?.offDays ?? offDays).filter(offDay => offDay.id !== offDayID),
			}));
			void queryClient.invalidateQueries({ queryKey: calendarCollectionKey });
			input.onCalendarChanged();
		},
		onError: error => {
			const errorMessage = errorToMessage(error, t);

			setFeedback({ message: errorMessage, tone: 'error' });
			toast.error(errorMessage);
		},
		onSettled: () => {
			setDeletingOffDayID('');
		},
	});

	const savedWeekdays = useMemo(() => enabledWeekdaysFromWorkingDays(workingDays), [workingDays]);
	const sortedOffDays = useMemo(() => sortWorkspaceOffDays(offDays), [offDays]);
	const changed = useMemo(() => !sameWeekdays(savedWeekdays, selectedWeekdays), [savedWeekdays, selectedWeekdays]);
	const upcomingOffDayCount = useMemo(() => upcomingWorkspaceOffDayCount(offDays), [offDays]);
	const mutationBusy = saveWorkingDaysMutation.isPending || createOffDayMutation.isPending || deleteOffDayMutation.isPending;
	const loadState = workingCalendarLoadState(calendarQuery.isLoading, calendarQuery.isError, saveWorkingDaysMutation.isPending, createOffDayMutation.isPending, deleteOffDayMutation.isPending);
	const message = calendarQuery.isError ? errorToMessage(calendarQuery.error, t) : feedback.message;
	const messageTone = calendarQuery.isError ? 'error' : feedback.tone;

	/**
	 * updateOffDayDraft patches the create off-day form.
	 */
	function updateOffDayDraft(patch: WorkspaceOffDayDraftPatch): void {
		setOffDayDraft(current => ({
			...current,
			...patch,
		}));
	}

	/**
	 * saveWorkingDays persists selected workspace working days.
	 */
	async function saveWorkingDays(): Promise<void> {
		if (!input.canManageCalendar) {
			showValidationError(t('settings.workingCalendar.error.permission'));
			return;
		}

		if (selectedWeekdays.length === 0) {
			showValidationError(t('settings.workingCalendar.error.weekdayRequired'));
			return;
		}

		setFeedback({ message: '', tone: 'success' });
		await saveWorkingDaysMutation.mutateAsync(selectedWeekdays).catch(() => undefined);
	}

	/**
	 * createOffDay creates a workspace skip/off-day.
	 */
	async function createOffDay(): Promise<void> {
		if (!input.canManageCalendar) {
			showValidationError(t('settings.workingCalendar.error.permission'));
			return;
		}

		const cleanLabel = offDayDraft.label.trim();

		if (offDayDraft.date.trim() === '') {
			showValidationError(t('settings.workingCalendar.error.offDayDateRequired'));
			return;
		}

		if (cleanLabel === '') {
			showValidationError(t('settings.workingCalendar.error.offDayLabelRequired'));
			return;
		}

		setFeedback({ message: '', tone: 'success' });
		await createOffDayMutation.mutateAsync({
			...offDayDraft,
			label: cleanLabel,
		}).catch(() => undefined);
	}

	/**
	 * deleteOffDay deletes one workspace off-day.
	 */
	async function deleteOffDay(offDayID: string): Promise<void> {
		if (!input.canManageCalendar) {
			showValidationError(t('settings.workingCalendar.error.permission'));
			return;
		}

		setFeedback({ message: '', tone: 'success' });
		await deleteOffDayMutation.mutateAsync(offDayID).catch(() => undefined);
	}

	/**
	 * showValidationError renders and toasts a local preflight error.
	 */
	function showValidationError(messageText: string): void {
		setFeedback({ message: messageText, tone: 'error' });
		toast.error(messageText);
	}

	return {
		loadState,
		message,
		messageTone,
		workingDays,
		selectedWeekdays,
		savedWeekdays,
		offDays,
		sortedOffDays,
		offDayDraft,
		deletingOffDayID,
		isBusy: calendarQuery.isLoading || mutationBusy,
		changed,
		selectedWeekdayLabel: selectedWeekdayLabel(selectedWeekdays, t),
		upcomingOffDayCount,
		setSelectedWeekdays,
		updateOffDayDraft,
		saveWorkingDays,
		createOffDay,
		deleteOffDay,
	};
}

/**
 * loadWorkingCalendarSnapshot reads all calendar settings needed by the page.
 */
async function loadWorkingCalendarSnapshot(workspaceID: string): Promise<WorkingCalendarSnapshot> {
	const [workingDaysResponse, offDaysResponse] = await Promise.all([
		listWorkspaceWorkingDays(workspaceID),
		listWorkspaceOffDays(workspaceID),
	]);

	return {
		workingDays: workingDaysResponse.workingDays,
		offDays: offDaysResponse.offDays,
	};
}

/**
 * setWorkingCalendarSnapshot updates the cached calendar snapshot immutably.
 */
function setWorkingCalendarSnapshot(
	queryClient: ReturnType<typeof useQueryClient>,
	queryKey: ReturnType<typeof campfireQueryKeys.workingCalendar>,
	buildNext: (current: WorkingCalendarSnapshot | undefined) => WorkingCalendarSnapshot,
): void {
	queryClient.setQueryData<WorkingCalendarSnapshot>(queryKey, current => buildNext(current));
}

/**
 * workingCalendarLoadState maps query/mutation state to the legacy page state.
 */
function workingCalendarLoadState(
	isLoading: boolean,
	isError: boolean,
	isSavingWorkingDays: boolean,
	isCreatingOffDay: boolean,
	isDeletingOffDay: boolean,
): WorkingCalendarLoadState {
	if (isLoading) {
		return 'loading';
	}

	if (isError) {
		return 'error';
	}

	if (isDeletingOffDay) {
		return 'deleting';
	}

	if (isSavingWorkingDays || isCreatingOffDay) {
		return 'saving';
	}

	return 'ready';
}
