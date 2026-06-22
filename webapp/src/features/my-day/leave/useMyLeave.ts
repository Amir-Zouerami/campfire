import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import {
	cancelLeaveRequest,
	createLeaveChangeRequest,
	createLeaveRequest,
	listApprovedLeaveRequests,
	listLeaveTypes,
	listMyActiveLeaveRequests,
	updateLeaveRequest,
	validateLeaveRequest,
} from '@/api';
import { toast } from '@/components/campfire/campfire-toast';
import { campfireQueryKeys } from '@/query';
import type { ApprovedLeaveRequest, LeaveType, PendingLeaveRequest, Workspace } from '@/types/domain';

import {
	draftHasDateRange,
	emptyLeaveDraft,
	errorToMessage,
	formatLeaveRange,
	localLeaveWarnings,
	normalizeLeaveDraftForMode,
	rangesOverlap,
	validateLeaveDraft,
} from './my-leave.helpers';
import type { UseMyLeaveText } from './my-leave.i18n';
import type { MyLeaveDraft, MyLeaveDraftPatch, MyLeaveLoadState, MyLeaveWarning } from './my-leave.types';

/**
 * UseMyLeaveInput contains workspace context and refresh callbacks.
 */
type UseMyLeaveInput = {
	readonly workspace: Workspace;
	readonly text: UseMyLeaveText;
	readonly onLeaveCreated: () => void;
	readonly onLeaveCancelled: () => void;
};

/**
 * MyLeaveSnapshot is the query-owned personal leave read model.
 */
type MyLeaveSnapshot = {
	readonly leaveTypes: readonly LeaveType[];
	readonly myActiveLeaves: readonly PendingLeaveRequest[];
};

/**
 * UseMyLeaveResult contains all state and actions for the personal leave workflow.
 */
export type UseMyLeaveResult = {
	readonly loadState: MyLeaveLoadState;
	readonly leaveTypes: readonly LeaveType[];
	readonly myActiveLeaves: readonly PendingLeaveRequest[];
	readonly approvedLeaves: readonly ApprovedLeaveRequest[];
	readonly warnings: readonly MyLeaveWarning[];
	readonly draft: MyLeaveDraft;
	readonly message: string;
	readonly isBusy: boolean;
	readonly activeLeaveCount: number;
	readonly pendingLeaveCount: number;
	readonly approvedLeaveCount: number;
	readonly updateDraft: (patch: MyLeaveDraftPatch) => void;
	readonly submitLeaveRequest: () => Promise<void>;
	readonly cancelMyLeaveRequest: (leaveRequestId: string) => Promise<void>;
	readonly requestMyLeaveChange: (leaveRequestId: string, draft: MyLeaveDraft) => Promise<void>;
};

/**
 * useMyLeave owns request form state while TanStack Query owns leave server state.
 */
export function useMyLeave(input: UseMyLeaveInput): UseMyLeaveResult {
	const queryClient = useQueryClient();
	const [draft, setDraft] = useState<MyLeaveDraft>(emptyLeaveDraft);
	const [message, setMessage] = useState('');

	const snapshotQuery = useQuery({
		queryKey: campfireQueryKeys.myLeaveSnapshot(input.workspace.id),
		queryFn: () => fetchMyLeaveSnapshot(input.workspace.id),
		staleTime: 30_000,
	});

	const approvedLeavesQuery = useQuery({
		queryKey: campfireQueryKeys.myApprovedLeaves(input.workspace.id, draft.startDate, draft.endDate),
		queryFn: () => listApprovedLeaveRequests(input.workspace.id, draft.startDate, draft.endDate),
		enabled: draftHasDateRange(draft),
		staleTime: 30_000,
	});

	const leaveTypes = useMemo(() => {
		return (snapshotQuery.data?.leaveTypes ?? []).filter(leaveType => normalizeLeaveTypeCode(leaveType.code) !== 'custom');
	}, [snapshotQuery.data?.leaveTypes]);
	const myActiveLeaves = snapshotQuery.data?.myActiveLeaves ?? [];
	const approvedLeaves = approvedLeavesQuery.data?.leaveRequests ?? [];

	useEffect(() => {
		if (leaveTypes.length === 0) {
			return;
		}

		setDraft(current => {
			if (current.leaveTypeId.trim() !== '') {
				return current;
			}

			return {
				...current,
				leaveTypeId: leaveTypes[0]?.id ?? '',
			};
		});
	}, [leaveTypes]);

	const warnings = useMemo(() => {
		return localLeaveWarnings(draft, myActiveLeaves, approvedLeaves, input.text.warnings);
	}, [approvedLeaves, draft, input.text.warnings, myActiveLeaves]);

	const pendingLeaveCount = useMemo(() => {
		return myActiveLeaves.filter(item => item.leaveRequest.status === 'pending').length;
	}, [myActiveLeaves]);

	const approvedLeaveCount = useMemo(() => {
		return myActiveLeaves.filter(item => item.leaveRequest.status === 'approved').length;
	}, [myActiveLeaves]);

	const createMutation = useMutation({
		mutationFn: createValidatedLeaveRequest,
		onSuccess: async response => {
			setDraft(current => ({
				...emptyLeaveDraft(),
				leaveTypeId: current.leaveTypeId,
			}));
			setMessage(input.text.requestStatusMessage(response.leaveRequest.status));
			toast.success(input.text.submittedToast);
			await invalidateMyLeaveQueries(queryClient, input.workspace.id);
			input.onLeaveCreated();
		},
		onError: error => {
			const errorMessage = errorToMessage(error, input.text.fallbackError);
			setMessage(errorMessage);
			toast.error(errorMessage);
		},
	});


	const changeRequestMutation = useMutation({
		mutationFn: async (inputValue: { readonly leaveRequestId: string; readonly draft: MyLeaveDraft }) => {
			return createValidatedLeaveChangeRequest(inputValue.leaveRequestId, inputValue.draft);
		},
		onSuccess: async () => {
			setMessage(input.text.editRequestedMessage);
			toast.success(input.text.editRequestedToast);
			await invalidateMyLeaveQueries(queryClient, input.workspace.id);
		},
		onError: error => {
			const errorMessage = errorToMessage(error, input.text.fallbackError);
			setMessage(errorMessage);
			toast.error(errorMessage);
		},
	});

	const directEditMutation = useMutation({
		mutationFn: async (inputValue: { readonly leaveRequestId: string; readonly draft: MyLeaveDraft }) => {
			return createValidatedDirectLeaveEdit(inputValue.leaveRequestId, inputValue.draft);
		},
		onSuccess: async () => {
			setMessage(input.text.editSavedMessage);
			toast.success(input.text.editSavedToast);
			await invalidateMyLeaveQueries(queryClient, input.workspace.id);
		},
		onError: error => {
			const errorMessage = errorToMessage(error, input.text.fallbackError);
			setMessage(errorMessage);
			toast.error(errorMessage);
		},
	});

	const cancelMutation = useMutation({
		mutationFn: cancelLeaveRequest,
		onSuccess: async () => {
			setMessage(input.text.cancelledMessage);
			toast.success(input.text.cancelledToast);
			await invalidateMyLeaveQueries(queryClient, input.workspace.id);
			input.onLeaveCancelled();
		},
		onError: error => {
			const errorMessage = errorToMessage(error, input.text.fallbackError);
			setMessage(errorMessage);
			toast.error(errorMessage);
		},
	});

	const mutationPending = createMutation.isPending || changeRequestMutation.isPending || directEditMutation.isPending || cancelMutation.isPending;
	const loadState = resolveLoadState(snapshotQuery.isPending, snapshotQuery.isError, mutationPending);
	const displayedMessage = snapshotQuery.isError ? errorToMessage(snapshotQuery.error, input.text.fallbackError) : message;
	const isBusy = loadState === 'loading' || loadState === 'saving' || loadState === 'validating';

	/**
	 * updateDraft patches the leave request draft.
	 */
	function updateDraft(patch: MyLeaveDraftPatch): void {
		setDraft(current => normalizeLeaveDraftForMode({ ...current, ...patch }));
		setMessage('');
	}

	/**
	 * createValidatedLeaveRequest validates the draft locally and remotely before create.
	 */
	async function createValidatedLeaveRequest(): Promise<Awaited<ReturnType<typeof createLeaveRequest>>> {
		const validationMessage = validateLeaveDraft(draft, input.text.validation);
		if (validationMessage !== null) {
			throw new Error(validationMessage);
		}

		const overlappingActiveLeave = myActiveLeaves.find(item =>
			rangesOverlap(draft.startDate, draft.endDate, item.leaveRequest),
		);
		if (overlappingActiveLeave !== undefined) {
			throw new Error(input.text.overlapWithOwnRequest(
				overlappingActiveLeave.leaveRequest.status,
				formatLeaveRange(overlappingActiveLeave.leaveRequest),
			));
		}

		const baseRequest = {
			workspaceId: input.workspace.id,
			leaveTypeId: draft.leaveTypeId,
			startDate: draft.startDate,
			endDate: draft.endDate,
			durationMode: draft.durationMode,
			halfDayPart: draft.halfDayPart,
			startTime: draft.startTime,
			endTime: draft.endTime,
			backupUserId: draft.backupUserId.trim(),
			canContactIfNeeded: draft.canContactIfNeeded,
		};

		const validation = await validateLeaveRequest(baseRequest);
		if (!validation.valid) {
			const validationWarnings = Array.isArray(validation.warnings) ? validation.warnings : [];
			throw new Error(validationWarnings[0] ?? input.text.invalidRequest);
		}

		return createLeaveRequest({
			...baseRequest,
			reason: draft.reason.trim(),
		});
	}

	/**
	 * createValidatedDirectLeaveEdit validates and directly updates member-owned editable leave.
	 */
	async function createValidatedDirectLeaveEdit(
		leaveRequestId: string,
		changeDraft: MyLeaveDraft,
	): Promise<Awaited<ReturnType<typeof updateLeaveRequest>>> {
		const baseRequest = await buildValidatedLeaveEditPayload(leaveRequestId, changeDraft);

		return updateLeaveRequest(leaveRequestId, {
			...baseRequest,
			reason: changeDraft.reason.trim(),
		});
	}

	async function createValidatedLeaveChangeRequest(
		leaveRequestId: string,
		changeDraft: MyLeaveDraft,
	): Promise<Awaited<ReturnType<typeof createLeaveChangeRequest>>> {
		const baseRequest = await buildValidatedLeaveEditPayload(leaveRequestId, changeDraft);

		return createLeaveChangeRequest(leaveRequestId, {
			...baseRequest,
			reason: changeDraft.reason.trim(),
		});
	}

	/**
	 * buildValidatedLeaveEditPayload validates shared direct-edit and edit-request fields.
	 */
	async function buildValidatedLeaveEditPayload(
		leaveRequestId: string,
		changeDraft: MyLeaveDraft,
	): Promise<{
		readonly workspaceId: string;
		readonly leaveTypeId: string;
		readonly startDate: string;
		readonly endDate: string;
		readonly durationMode: MyLeaveDraft['durationMode'];
		readonly halfDayPart: MyLeaveDraft['halfDayPart'];
		readonly startTime: string;
		readonly endTime: string;
		readonly backupUserId: string;
		readonly canContactIfNeeded: boolean;
	}> {
		const validationMessage = validateLeaveDraft(changeDraft, input.text.validation);
		if (validationMessage !== null) {
			throw new Error(validationMessage);
		}

		const overlappingActiveLeave = myActiveLeaves.find(item => {
			if (item.leaveRequest.id === leaveRequestId) {
				return false;
			}

			return rangesOverlap(changeDraft.startDate, changeDraft.endDate, item.leaveRequest);
		});
		if (overlappingActiveLeave !== undefined) {
			throw new Error(input.text.overlapWithOwnRequest(
				overlappingActiveLeave.leaveRequest.status,
				formatLeaveRange(overlappingActiveLeave.leaveRequest),
			));
		}

		const baseRequest = {
			workspaceId: input.workspace.id,
			leaveTypeId: changeDraft.leaveTypeId,
			startDate: changeDraft.startDate,
			endDate: changeDraft.endDate,
			durationMode: changeDraft.durationMode,
			halfDayPart: changeDraft.halfDayPart,
			startTime: changeDraft.startTime,
			endTime: changeDraft.endTime,
			backupUserId: changeDraft.backupUserId.trim(),
			canContactIfNeeded: changeDraft.canContactIfNeeded,
		};

		const validation = await validateLeaveRequest(baseRequest);
		if (!validation.valid) {
			const validationWarnings = Array.isArray(validation.warnings) ? validation.warnings : [];
			throw new Error(validationWarnings[0] ?? input.text.invalidRequest);
		}

		return baseRequest;
	}

	/**
	 * submitLeaveRequest validates and creates a leave request.
	 */
	async function submitLeaveRequest(): Promise<void> {
		setMessage('');
		await createMutation.mutateAsync();
	}

	/**
	 * cancelMyLeaveRequest cancels a current-user leave request.
	 */
	async function cancelMyLeaveRequest(leaveRequestId: string): Promise<void> {
		setMessage('');
		await cancelMutation.mutateAsync(leaveRequestId);
	}


	/**
	 * requestMyLeaveChange submits a proposed change for approval instead of directly mutating approved leave.
	 */
	async function requestMyLeaveChange(leaveRequestId: string, changeDraft: MyLeaveDraft): Promise<void> {
		setMessage('');
		const currentLeave = myActiveLeaves.find(item => item.leaveRequest.id === leaveRequestId)?.leaveRequest;
		if (currentLeave === undefined) {
			throw new Error(input.text.fallbackError);
		}

		if (approvedLeaveIsInProgress(currentLeave, input.workspace.timezone)) {
			await changeRequestMutation.mutateAsync({ leaveRequestId, draft: changeDraft });
			return;
		}

		await directEditMutation.mutateAsync({ leaveRequestId, draft: changeDraft });
	}

	return {
		loadState,
		leaveTypes,
		myActiveLeaves,
		approvedLeaves,
		warnings,
		draft,
		message: displayedMessage,
		isBusy,
		activeLeaveCount: myActiveLeaves.length,
		pendingLeaveCount,
		approvedLeaveCount,
		updateDraft,
		submitLeaveRequest,
		cancelMyLeaveRequest,
		requestMyLeaveChange,
	};
}

/**
 * approvedLeaveIsInProgress mirrors backend member-edit gating for button labels.
 */
function approvedLeaveIsInProgress(request: PendingLeaveRequest['leaveRequest'], timezone: string): boolean {
	if (request.status !== 'approved') {
		return false;
	}

	const interval = leaveInterval(request, timezone);
	if (interval === null) {
		return false;
	}

	const now = Date.now();

	return now >= interval.start.getTime() && now < interval.end.getTime();
}

/**
 * leaveInterval returns the workspace-timezone interval for the leave request.
 */
function leaveInterval(request: PendingLeaveRequest['leaveRequest'], timezone: string): { readonly start: Date; readonly end: Date } | null {
	const startTime = request.durationMode === 'hourly' ? request.startTime : '00:00';
	const start = zonedDateTimeToDate(request.startDate, startTime, timezone);
	if (start === null) {
		return null;
	}

	if (request.durationMode === 'hourly') {
		const end = zonedDateTimeToDate(request.endDate, request.endTime, timezone);

		return end === null ? null : { start, end };
	}

	const end = zonedDateTimeToDate(addDays(request.endDate, 1), '00:00', timezone);

	return end === null ? null : { start, end };
}

/**
 * zonedDateTimeToDate converts a workspace-local date/time to an absolute Date.
 */
function zonedDateTimeToDate(dateValue: string, timeValue: string, timezone: string): Date | null {
	const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue.trim());
	const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue.trim());
	if (dateMatch === null || timeMatch === null) {
		return null;
	}

	const year = Number.parseInt(dateMatch[1] ?? '', 10);
	const month = Number.parseInt(dateMatch[2] ?? '', 10);
	const day = Number.parseInt(dateMatch[3] ?? '', 10);
	const hour = Number.parseInt(timeMatch[1] ?? '', 10);
	const minute = Number.parseInt(timeMatch[2] ?? '', 10);
	if (![year, month, day, hour, minute].every(Number.isFinite)) {
		return null;
	}

	const targetUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
	let candidate = new Date(targetUtc);

	for (let attempt = 0; attempt < 2; attempt += 1) {
		const localParts = getDateTimePartsInTimezone(candidate, timezone);
		if (localParts === null) {
			return null;
		}

		const localAsUtc = Date.UTC(
			localParts.year,
			localParts.month - 1,
			localParts.day,
			localParts.hour,
			localParts.minute,
			0,
		);
		candidate = new Date(targetUtc - (localAsUtc - candidate.getTime()));
	}

	return candidate;
}

/**
 * getDateTimePartsInTimezone formats an instant into date/time parts.
 */
function getDateTimePartsInTimezone(date: Date, timezone: string): {
	readonly year: number;
	readonly month: number;
	readonly day: number;
	readonly hour: number;
	readonly minute: number;
} | null {
	try {
		const formatter = new Intl.DateTimeFormat('en-US', {
			timeZone: timezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23',
		});
		const parts = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));

		return {
			year: Number.parseInt(parts.year ?? '', 10),
			month: Number.parseInt(parts.month ?? '', 10),
			day: Number.parseInt(parts.day ?? '', 10),
			hour: Number.parseInt(parts.hour ?? '', 10),
			minute: Number.parseInt(parts.minute ?? '', 10),
		};
	} catch (_error: unknown) {
		return null;
	}
}

/**
 * addDays adds calendar days to a YYYY-MM-DD date string.
 */
function addDays(date: string, days: number): string {
	const [year, month, day] = date.split('-').map(Number);
	if (![year, month, day].every(Number.isFinite)) {
		return date;
	}

	const parsed = new Date(year, month - 1, day);
	parsed.setDate(parsed.getDate() + days);

	return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
}

/**
 * fetchMyLeaveSnapshot loads leave type options and current-user active leaves together.
 */
async function fetchMyLeaveSnapshot(workspaceID: string): Promise<MyLeaveSnapshot> {
	const [typesResponse, activeLeavesResponse] = await Promise.all([
		listLeaveTypes(workspaceID),
		listMyActiveLeaveRequests(workspaceID),
	]);

	return {
		leaveTypes: typesResponse.leaveTypes,
		myActiveLeaves: activeLeavesResponse.leaveRequests,
	};
}

/**
 * invalidateMyLeaveQueries refreshes all personal leave data for a workspace.
 */
async function invalidateMyLeaveQueries(queryClient: QueryClient, workspaceID: string): Promise<void> {
	await queryClient.invalidateQueries({ queryKey: campfireQueryKeys.myDay(workspaceID) });
}

/**
 * resolveLoadState maps query/mutation states to the existing My Leave page states.
 */
function resolveLoadState(isInitialLoading: boolean, isError: boolean, isSaving: boolean): MyLeaveLoadState {
	if (isInitialLoading) {
		return 'loading';
	}

	if (isSaving) {
		return 'saving';
	}

	if (isError) {
		return 'error';
	}

	return 'ready';
}



/**
 * normalizeLeaveTypeCode makes built-in leave type filtering resilient to old seeds.
 */
function normalizeLeaveTypeCode(value: string): string {
	return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}