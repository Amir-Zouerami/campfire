import { useEffect, useMemo, useState } from 'react';
import { toast } from '@/components/campfire/campfire-toast';

import {
	cancelLeaveRequest,
	createLeaveRequest,
	listApprovedLeaveRequests,
	listLeaveTypes,
	listMyActiveLeaveRequests,
	validateLeaveRequest,
} from '@/api';
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
import type { MyLeaveDraft, MyLeaveDraftPatch, MyLeaveLoadState, MyLeaveWarning } from './my-leave.types';

/**
 * UseMyLeaveInput contains workspace context and refresh callbacks.
 */
type UseMyLeaveInput = {
	readonly workspace: Workspace;
	readonly onLeaveCreated: () => void;
	readonly onLeaveCancelled: () => void;
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
};

/**
 * useMyLeave owns loading, validation, creation, and cancellation for personal leave.
 */
export function useMyLeave(input: UseMyLeaveInput): UseMyLeaveResult {
	const [loadState, setLoadState] = useState<MyLeaveLoadState>('idle');
	const [leaveTypes, setLeaveTypes] = useState<readonly LeaveType[]>([]);
	const [myActiveLeaves, setMyActiveLeaves] = useState<readonly PendingLeaveRequest[]>([]);
	const [approvedLeaves, setApprovedLeaves] = useState<readonly ApprovedLeaveRequest[]>([]);
	const [draft, setDraft] = useState<MyLeaveDraft>(emptyLeaveDraft);
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * loadInitialData loads leave types and current-user active leaves.
		 */
		async function loadInitialData(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const [typesResponse, activeLeavesResponse] = await Promise.all([
					listLeaveTypes(input.workspace.id),
					listMyActiveLeaveRequests(input.workspace.id),
				]);

				if (!isActive) {
					return;
				}

				setLeaveTypes(typesResponse.leaveTypes);
				setMyActiveLeaves(activeLeavesResponse.leaveRequests);
				setDraft(current => ({
					...current,
					leaveTypeId: current.leaveTypeId || typesResponse.leaveTypes[0]?.id || '',
				}));
				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setMessage(errorToMessage(error));
				setLoadState('error');
			}
		}

		void loadInitialData();

		return () => {
			isActive = false;
		};
	}, [input.workspace.id]);

	useEffect(() => {
		let isActive = true;

		/**
		 * loadApprovedLeavesForRange loads overlapping approved leave for local warnings.
		 */
		async function loadApprovedLeavesForRange(): Promise<void> {
			if (!draftHasDateRange(draft)) {
				setApprovedLeaves([]);
				return;
			}

			try {
				const response = await listApprovedLeaveRequests(input.workspace.id, draft.startDate, draft.endDate);

				if (!isActive) {
					return;
				}

				setApprovedLeaves(response.leaveRequests);
			} catch (_error: unknown) {
				if (!isActive) {
					return;
				}

				setApprovedLeaves([]);
			}
		}

		void loadApprovedLeavesForRange();

		return () => {
			isActive = false;
		};
	}, [input.workspace.id, draft.startDate, draft.endDate]);

	const warnings = useMemo(() => {
		return localLeaveWarnings(draft, myActiveLeaves, approvedLeaves);
	}, [draft, myActiveLeaves, approvedLeaves]);

	const isBusy = loadState === 'loading' || loadState === 'validating' || loadState === 'saving';

	const pendingLeaveCount = useMemo(() => {
		return myActiveLeaves.filter(item => item.leaveRequest.status === 'pending').length;
	}, [myActiveLeaves]);

	const approvedLeaveCount = useMemo(() => {
		return myActiveLeaves.filter(item => item.leaveRequest.status === 'approved').length;
	}, [myActiveLeaves]);

	/**
	 * updateDraft patches the leave request draft.
	 */
	function updateDraft(patch: MyLeaveDraftPatch): void {
		setDraft(current => normalizeLeaveDraftForMode({ ...current, ...patch }));
	}

	/**
	 * submitLeaveRequest validates and creates a leave request.
	 */
	async function submitLeaveRequest(): Promise<void> {
		const validationMessage = validateLeaveDraft(draft);
		if (validationMessage !== null) {
			setLoadState('error');
			setMessage(validationMessage);
			return;
		}

		const overlappingActiveLeave = myActiveLeaves.find(item =>
			rangesOverlap(draft.startDate, draft.endDate, item.leaveRequest),
		);
		if (overlappingActiveLeave !== undefined) {
			const errorMessage = `You already have a ${overlappingActiveLeave.leaveRequest.status} leave request overlapping ${formatLeaveRange(overlappingActiveLeave.leaveRequest)}. Cancel the existing request first.`;

			setLoadState('error');
			setMessage(errorMessage);
			toast.error(errorMessage);
			return;
		}

		setLoadState('validating');
		setMessage('');

		try {
			const validation = await validateLeaveRequest({
				workspaceId: input.workspace.id,
				leaveTypeId: draft.leaveTypeId,
				startDate: draft.startDate,
				endDate: draft.endDate,
				durationMode: draft.durationMode,
				halfDayPart: draft.halfDayPart,
				startTime: draft.startTime,
				endTime: draft.endTime,
				backupUserId: draft.backupUserId.trim(),
			});

			if (!validation.valid) {
				const validationWarnings = Array.isArray(validation.warnings) ? validation.warnings : [];

				setLoadState('error');
				setMessage(validationWarnings[0] ?? 'This leave request is not valid.');
				return;
			}

			setLoadState('saving');

			const response = await createLeaveRequest({
				workspaceId: input.workspace.id,
				leaveTypeId: draft.leaveTypeId,
				startDate: draft.startDate,
				endDate: draft.endDate,
				durationMode: draft.durationMode,
				halfDayPart: draft.halfDayPart,
				startTime: draft.startTime,
				endTime: draft.endTime,
				backupUserId: draft.backupUserId.trim(),
				reason: draft.reason.trim(),
			});

			const activeResponse = await listMyActiveLeaveRequests(input.workspace.id);

			setMyActiveLeaves(activeResponse.leaveRequests);
			setDraft(current => ({
				...emptyLeaveDraft(),
				leaveTypeId: current.leaveTypeId,
			}));
			setLoadState('ready');
			setMessage(`Leave request ${response.leaveRequest.status}.`);
			toast.success('Leave request submitted');
			input.onLeaveCreated();
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);
			setLoadState('error');
			setMessage(errorMessage);
			toast.error(errorMessage);
		}
	}

	/**
	 * cancelMyLeaveRequest cancels a current-user leave request.
	 */
	async function cancelMyLeaveRequest(leaveRequestId: string): Promise<void> {
		setLoadState('saving');
		setMessage('');

		try {
			await cancelLeaveRequest(leaveRequestId);

			setMyActiveLeaves(current => current.filter(item => item.leaveRequest.id !== leaveRequestId));
			setLoadState('ready');
			setMessage('Leave request cancelled.');
			toast.success('Leave request cancelled');
			input.onLeaveCancelled();
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);
			setLoadState('error');
			setMessage(errorMessage);
			toast.error(errorMessage);
		}
	}

	return {
		loadState,
		leaveTypes,
		myActiveLeaves,
		approvedLeaves,
		warnings,
		draft,
		message,
		isBusy,
		activeLeaveCount: myActiveLeaves.length,
		pendingLeaveCount,
		approvedLeaveCount,
		updateDraft,
		submitLeaveRequest,
		cancelMyLeaveRequest,
	};
}