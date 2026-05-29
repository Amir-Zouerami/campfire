import { useEffect, useMemo, useState } from 'react';
import { toast } from '@/components/campfire/campfire-toast';

import {
	createWorkspaceOffDay,
	deleteWorkspaceOffDay,
	listWorkspaceOffDays,
	listWorkspaceWorkingDays,
	updateWorkspaceWorkingDays,
} from '@/api';
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
	WorkingCalendarLoadState,
	WorkspaceOffDayDraft,
	WorkspaceOffDayDraftPatch,
} from './working-calendar.types';

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
	readonly workingDays: readonly WorkspaceWorkingDay[];
	readonly selectedWeekdays: readonly number[];
	readonly savedWeekdays: readonly number[];
	readonly offDays: readonly WorkspaceOffDay[];
	readonly sortedOffDays: readonly WorkspaceOffDay[];
	readonly offDayDraft: WorkspaceOffDayDraft;
	readonly deletingOffDayID: string;
	readonly message: string;
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
 * useWorkingCalendar owns workspace working days and workspace off-days.
 */
export function useWorkingCalendar(input: UseWorkingCalendarInput): UseWorkingCalendarResult {
	const [loadState, setLoadState] = useState<WorkingCalendarLoadState>('idle');
	const [workingDays, setWorkingDays] = useState<readonly WorkspaceWorkingDay[]>([]);
	const [selectedWeekdays, setSelectedWeekdays] = useState<readonly number[]>([]);
	const [offDays, setOffDays] = useState<readonly WorkspaceOffDay[]>([]);
	const [offDayDraft, setOffDayDraft] = useState<WorkspaceOffDayDraft>(emptyWorkspaceOffDayDraft);
	const [deletingOffDayID, setDeletingOffDayID] = useState('');
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * loadCalendar loads working days and workspace off-days together.
		 */
		async function loadCalendar(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const [workingDaysResponse, offDaysResponse] = await Promise.all([
					listWorkspaceWorkingDays(input.workspace.id),
					listWorkspaceOffDays(input.workspace.id),
				]);

				if (!isActive) {
					return;
				}

				const enabledWeekdays = enabledWeekdaysFromWorkingDays(workingDaysResponse.workingDays);

				setWorkingDays(workingDaysResponse.workingDays);
				setSelectedWeekdays(enabledWeekdays);
				setOffDays(offDaysResponse.offDays);
				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setMessage(errorToMessage(error));
				setLoadState('error');
			}
		}

		void loadCalendar();

		return () => {
			isActive = false;
		};
	}, [input.workspace.id, input.refreshToken]);

	const savedWeekdays = useMemo(() => enabledWeekdaysFromWorkingDays(workingDays), [workingDays]);
	const sortedOffDays = useMemo(() => sortWorkspaceOffDays(offDays), [offDays]);
	const changed = useMemo(() => !sameWeekdays(savedWeekdays, selectedWeekdays), [savedWeekdays, selectedWeekdays]);
	const upcomingOffDayCount = useMemo(() => upcomingWorkspaceOffDayCount(offDays), [offDays]);
	const isBusy = loadState === 'loading' || loadState === 'saving' || loadState === 'deleting';

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
			setLoadState('error');
			setMessage('You do not have permission to update the working calendar.');
			return;
		}

		if (selectedWeekdays.length === 0) {
			setLoadState('error');
			setMessage('Choose at least one working day.');
			return;
		}

		setLoadState('saving');
		setMessage('');

		try {
			const response = await updateWorkspaceWorkingDays(input.workspace.id, {
				workingDays: [...selectedWeekdays],
			});

			const enabledWeekdays = enabledWeekdaysFromWorkingDays(response.workingDays);

			setWorkingDays(response.workingDays);
			setSelectedWeekdays(enabledWeekdays);
			setLoadState('ready');
			setMessage('Working days saved.');
			toast.success('Working days saved');
			input.onCalendarChanged();
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);

			setLoadState('error');
			setMessage(errorMessage);
			toast.error(errorMessage);
		}
	}

	/**
	 * createOffDay creates a workspace skip/off-day.
	 */
	async function createOffDay(): Promise<void> {
		if (!input.canManageCalendar) {
			setLoadState('error');
			setMessage('You do not have permission to add workspace off-days.');
			return;
		}

		const cleanLabel = offDayDraft.label.trim();

		if (offDayDraft.date.trim() === '') {
			setLoadState('error');
			setMessage('Off-day date is required.');
			return;
		}

		if (cleanLabel === '') {
			setLoadState('error');
			setMessage('Off-day label is required.');
			return;
		}

		setLoadState('saving');
		setMessage('');

		try {
			const response = await createWorkspaceOffDay(input.workspace.id, {
				date: offDayDraft.date,
				label: cleanLabel,
			});

			setOffDays(current => [...current, response.offDay]);
			setOffDayDraft(emptyWorkspaceOffDayDraft());
			setLoadState('ready');
			setMessage('Workspace off-day added.');
			toast.success('Workspace off-day added');
			input.onCalendarChanged();
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);

			setLoadState('error');
			setMessage(errorMessage);
			toast.error(errorMessage);
		}
	}

	/**
	 * deleteOffDay deletes one workspace off-day.
	 */
	async function deleteOffDay(offDayID: string): Promise<void> {
		if (!input.canManageCalendar) {
			setLoadState('error');
			setMessage('You do not have permission to delete workspace off-days.');
			return;
		}

		setLoadState('deleting');
		setDeletingOffDayID(offDayID);
		setMessage('');

		try {
			await deleteWorkspaceOffDay(input.workspace.id, offDayID);

			setOffDays(current => current.filter(offDay => offDay.id !== offDayID));
			setDeletingOffDayID('');
			setLoadState('ready');
			setMessage('Workspace off-day deleted.');
			toast.success('Workspace off-day deleted');
			input.onCalendarChanged();
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);

			setDeletingOffDayID('');
			setLoadState('error');
			setMessage(errorMessage);
			toast.error(errorMessage);
		}
	}

	return {
		loadState,
		workingDays,
		selectedWeekdays,
		savedWeekdays,
		offDays,
		sortedOffDays,
		offDayDraft,
		deletingOffDayID,
		message,
		isBusy,
		changed,
		selectedWeekdayLabel: selectedWeekdayLabel(selectedWeekdays),
		upcomingOffDayCount,
		setSelectedWeekdays,
		updateOffDayDraft,
		saveWorkingDays,
		createOffDay,
		deleteOffDay,
	};
}