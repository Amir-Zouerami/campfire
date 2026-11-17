import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
	ApiClientError,
	cancelLeaveRequest,
	createLeaveChangeRequest,
	createLeaveDeletionRequest,
	createLeaveRequest,
	errorMessageOf,
	listMyActiveLeaveRequests,
	updateLeaveRequest,
	validateLeaveRequest,
} from '@/shared/api';
import { leaveKeys, leaveRangeText, leaveStatusKey } from '@/shared/data/leave';
import { isolateBidi, useI18n } from '@/shared/i18n';
import { useWorkspaceSession } from '@/shared/session';
import { toast } from '@/shared/ui';
import type { PendingLeaveRequest } from '@/shared/types/domain';

import { leavesOverlap, normalizeDraft } from '@/shared/data/leaveDraft';
import type { LeaveDraft } from '@/shared/data/leaveDraft';

/**
 * useMyActiveLeaves loads the signed-in user's pending and approved leave.
 */
export function useMyActiveLeaves() {
	const { workspace } = useWorkspaceSession();

	return useQuery({
		queryKey: leaveKeys.mine(workspace.id),
		queryFn: async () => (await listMyActiveLeaveRequests(workspace.id)).leaveRequests,
		staleTime: 30_000,
	});
}

/**
 * useLeaveActions returns every way a member can change their own leave. Each action refreshes
 * all leave data afterwards. The backend sends the related direct messages to approvers and
 * the member, so the frontend only has to call the right endpoint.
 */
export function useLeaveActions(activeLeaves: readonly PendingLeaveRequest[]) {
	const { t } = useI18n();
	const { workspace } = useWorkspaceSession();
	const queryClient = useQueryClient();
	const refresh = (): Promise<void> => queryClient.invalidateQueries({ queryKey: leaveKeys.all(workspace.id) });

	// API failures were already reported by the HTTP client; only local errors still need a toast.
	const reportError = (error: unknown): void => {
		if (!(error instanceof ApiClientError)) {
			toast.error(errorMessageOf(error, t('myDay.leave.error.fallback')));
		}
	};

	/**
	 * prepare applies the same checks the legacy flow did before touching the server: reject an
	 * overlap with the member's own requests, then ask the server to validate the request.
	 */
	async function prepare(draft: LeaveDraft, ignoreLeaveID?: string) {
		const overlapping = activeLeaves.find(
			item => item.leaveRequest.id !== ignoreLeaveID && leavesOverlap(draft.startDate, draft.endDate, item.leaveRequest),
		);
		if (overlapping !== undefined) {
			throw new Error(
				t('myDay.leave.validation.overlapWithOwnRequest', {
					status: isolateBidi(t(leaveStatusKey(overlapping.leaveRequest.status))),
					range: isolateBidi(leaveRangeText(overlapping.leaveRequest)),
				}),
			);
		}

		const normalized = normalizeDraft(draft);
		const payload = {
			workspaceId: workspace.id,
			leaveTypeId: normalized.leaveTypeId,
			startDate: normalized.startDate,
			endDate: normalized.endDate,
			durationMode: normalized.durationMode,
			halfDayPart: normalized.halfDayPart,
			startTime: normalized.startTime,
			endTime: normalized.endTime,
			backupUserId: normalized.backupUserId.trim(),
			canContactIfNeeded: normalized.canContactIfNeeded,
		};

		const validation = await validateLeaveRequest(payload);
		if (!validation.valid) {
			throw new Error(validation.warnings[0] ?? t('myDay.leave.error.invalidRequest'));
		}

		return { payload, reason: normalized.reason.trim() };
	}

	const create = useMutation({
		mutationFn: async (draft: LeaveDraft) => {
			const { payload, reason } = await prepare(draft);

			return createLeaveRequest({ ...payload, reason });
		},
		onSuccess: () => {
			toast.success(t('myDay.leave.toast.submitted'));

			return refresh();
		},
		onError: reportError,
	});

	const editPending = useMutation({
		mutationFn: async (input: { readonly leaveRequestID: string; readonly draft: LeaveDraft }) => {
			const { payload, reason } = await prepare(input.draft, input.leaveRequestID);
			const { workspaceId: _workspaceId, ...body } = payload;

			return updateLeaveRequest(input.leaveRequestID, { ...body, reason });
		},
		onSuccess: () => {
			toast.success(t('myDay.leave.toast.editSaved'));

			return refresh();
		},
		onError: reportError,
	});

	const requestEdit = useMutation({
		mutationFn: async (input: { readonly leaveRequestID: string; readonly draft: LeaveDraft }) => {
			const { payload, reason } = await prepare(input.draft, input.leaveRequestID);
			const { workspaceId: _workspaceId, ...body } = payload;

			return createLeaveChangeRequest(input.leaveRequestID, { ...body, reason });
		},
		onSuccess: () => {
			toast.success(t('myDay.leave.toast.editRequested'));

			return refresh();
		},
		onError: reportError,
	});

	const cancel = useMutation({
		mutationFn: cancelLeaveRequest,
		onSuccess: () => {
			toast.success(t('myDay.leave.toast.cancelled'));

			return refresh();
		},
		onError: reportError,
	});

	const requestDeletion = useMutation({
		mutationFn: (leaveRequestID: string) => createLeaveDeletionRequest(leaveRequestID, { reason: '' }),
		onSuccess: () => {
			toast.success(t('myDay.leave.toast.deleteRequested'));

			return refresh();
		},
		onError: reportError,
	});

	return { create, editPending, requestEdit, cancel, requestDeletion };
}
