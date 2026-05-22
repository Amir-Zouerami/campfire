import type { LeaveStatus } from '@/types/domain';

/**
 * TeamLeaveApprovalLoadState describes the approval queue loading state.
 */
export type TeamLeaveApprovalLoadState = 'idle' | 'loading' | 'ready' | 'saving' | 'hidden' | 'error';

/**
 * LeaveDecision is an approver action for a pending leave request.
 */
export type LeaveDecision = Extract<LeaveStatus, 'approved' | 'rejected'>;

/**
 * LeaveDecisionComments stores approver comments keyed by leave request ID.
 */
export type LeaveDecisionComments = Readonly<Record<string, string>>;
