import type { ReactElement } from 'react';
import {
	Ban,
	CalendarDays,
	Clock3,
	MessageSquareText,
	ThumbsDown,
	ThumbsUp,
	Umbrella,
} from 'lucide-react';

import { CampfireBidiText } from '@/components/campfire/CampfireBidiText';
import { CampfireEmpty, CampfireStatusPill } from '@/components/campfire/CampfireLayoutPrimitives';
import { CampfireUserAvatar } from '@/components/campfire/CampfireUserAvatar';
import { CampfireResponsiveTextarea } from '@/components/campfire/CampfireResponsiveInput';
import { Button } from '@/components/ui/button';
import {
	formatLocalizedLeaveDurationDetails,
	leaveDurationModeTranslationKey,
	localizedLeaveTypeName,
	leaveStatusTranslationKey,
} from '@/features/my-day/leave/my-leave.i18n';
import { leaveStatusTone } from '@/features/my-day/leave/my-leave.helpers';
import { useI18n } from '@/i18n';
import { sortByNewest } from '@/lib/sort';
import type { LeaveChangeRequest, LeaveRequest, PendingLeaveChangeRequest, PendingLeaveRequest } from '@/types/domain';

import { formatWorkspaceDateTime, formatWorkspaceLocalDate } from '../team-review-formatting';
import { approvalCardClassName } from './team-leave-approvals.helpers';
import type { LeaveDecision } from './team-leave-approvals.types';

/**
 * TeamLeaveApprovalQueueProps contains pending leave requests and decision actions.
 */
type TeamLeaveApprovalQueueProps = {
	readonly leaveRequests: readonly PendingLeaveRequest[];
	readonly changeRequests: readonly PendingLeaveChangeRequest[];
	readonly comments: Readonly<Record<string, string>>;
	readonly disabled: boolean;
	readonly timezone: string;
	readonly labelForUserID: (userID: string) => string;
	readonly onCommentChange: (leaveRequestID: string, comment: string) => void;
	readonly onDecision: (
		leaveRequestID: string,
		decision: LeaveDecision,
	) => Promise<void>;
	readonly onChangeDecision: (
		changeRequestID: string,
		decision: LeaveDecision,
	) => Promise<void>;
	readonly onCancel: (leaveRequestID: string) => Promise<void>;
};

/**
 * TeamLeaveApprovalQueue renders pending leave approval cards.
 */
export function TeamLeaveApprovalQueue(
	props: TeamLeaveApprovalQueueProps,
): ReactElement {
	const { t } = useI18n();
	const leaveRequests = sortByNewest(props.leaveRequests, item => newestLeaveDateValue(item.leaveRequest));
	const changeRequests = sortByNewest(props.changeRequests, item => newestChangeDateValue(item.changeRequest));

	if (leaveRequests.length === 0 && changeRequests.length === 0) {
		return (
			<CampfireEmpty
				icon={Umbrella}
				title={t('teamReview.approvals.empty.queue.title')}
				description={t('teamReview.approvals.empty.queue.description')}
			/>
		);
	}

	return (
		<div className="campfire-approval-queue">
			{changeRequests.length > 0 && (
				<section className="campfire-approval-section">
					<h3 className="campfire-approval-section-title">
						{t('teamReview.approvals.change.sectionTitle')}
					</h3>
					{changeRequests.map(item => (
						<TeamLeaveChangeApprovalCard
							key={item.changeRequest.id}
							item={item}
							comment={props.comments[item.changeRequest.id] ?? ''}
							disabled={props.disabled}
							timezone={props.timezone}
							labelForUserID={props.labelForUserID}
							onCommentChange={comment => props.onCommentChange(item.changeRequest.id, comment)}
							onDecision={decision => props.onChangeDecision(item.changeRequest.id, decision)}
						/>
					))}
				</section>
			)}

			{leaveRequests.length > 0 && (
				<section className="campfire-approval-section">
					<h3 className="campfire-approval-section-title">
						{t('teamReview.approvals.request.sectionTitle')}
					</h3>
					{leaveRequests.map(item => (
						<TeamLeaveApprovalCard
							key={item.leaveRequest.id}
							item={item}
							comment={props.comments[item.leaveRequest.id] ?? ''}
							disabled={props.disabled}
							timezone={props.timezone}
							labelForUserID={props.labelForUserID}
							onCommentChange={comment => props.onCommentChange(item.leaveRequest.id, comment)}
							onDecision={decision => props.onDecision(item.leaveRequest.id, decision)}
							onCancel={() => props.onCancel(item.leaveRequest.id)}
						/>
					))}
				</section>
			)}
		</div>
	);
}

/**
 * newestLeaveDateValue returns the newest meaningful timestamp for sorting leave approval rows.
 */
function newestLeaveDateValue(request: LeaveRequest): string {
	return request.updatedAt || request.createdAt || request.startDate || request.endDate;
}

/**
 * newestChangeDateValue returns the newest meaningful timestamp for sorting leave edit request rows.
 */
function newestChangeDateValue(request: LeaveChangeRequest): string {
	return request.updatedAt || request.createdAt || request.startDate || request.endDate;
}

/**
 * TeamLeaveApprovalCard renders one pending leave request.
 */
function TeamLeaveApprovalCard(props: {
	readonly item: PendingLeaveRequest;
	readonly comment: string;
	readonly disabled: boolean;
	readonly timezone: string;
	readonly labelForUserID: (userID: string) => string;
	readonly onCommentChange: (comment: string) => void;
	readonly onDecision: (decision: LeaveDecision) => Promise<void>;
	readonly onCancel: () => Promise<void>;
}): ReactElement {
	const { htmlLang, t } = useI18n();
	const request = props.item.leaveRequest;
	const requesterLabel = props.labelForUserID(request.userId);
	const backupLabel = request.backupUserId.trim() === ''
		? t('common.notSet')
		: props.labelForUserID(request.backupUserId);
	const requestedAt = formatWorkspaceDateTime(request.createdAt, props.timezone, htmlLang, t('common.unknown'));
	const localizedRange = formatLocalizedApprovalRange(request.startDate, request.endDate, props.timezone, htmlLang, t('common.unknown'));
	const localizedLeaveType = localizedLeaveTypeName({ code: '', name: props.item.leaveTypeName }, t);
	return (
		<article className={approvalCardClassName()}>
			<header className="campfire-approval-card-header">
				<div className="campfire-approval-identity">
					<CampfireUserAvatar
						userID={request.userId}
						displayName={requesterLabel}
						username={requesterLabel}
						className="campfire-approval-user-avatar"
					/>
					<div className="campfire-approval-identity-copy">
						<h3 className="campfire-approval-requester-name">
							<CampfireBidiText>{requesterLabel}</CampfireBidiText>
						</h3>
					</div>
				</div>

				<CampfireStatusPill tone={leaveStatusTone(request.status)}>
					{t(leaveStatusTranslationKey(request.status))}
				</CampfireStatusPill>
			</header>

			<div className="campfire-approval-primary-row">
				<ApprovalDetail
					icon={<CalendarDays className="cf:size-4" />}
					label={t('teamReview.approvals.detail.dateRange')}
					value={localizedRange}
				/>
				<ApprovalDetail
					icon={<Clock3 className="cf:size-4" />}
					label={t('teamReview.approvals.detail.duration')}
					value={formatLocalizedLeaveDurationDetails(request, t)}
				/>
			</div>

			<div className="campfire-approval-detail-grid campfire-approval-detail-grid--minimal">
				<ApprovalDetail
					label={t('myDay.leave.field.leaveType')}
					value={localizedLeaveType}
				/>
				<ApprovalDetail
					label={t('teamReview.approvals.detail.mode')}
					value={t(leaveDurationModeTranslationKey(request.durationMode))}
				/>
				<ApprovalDetail label={t('teamReview.approvals.detail.backup')} value={backupLabel} />
				<ApprovalDetail
					label={t('teamReview.approvals.detail.canContact')}
					value={request.canContactIfNeeded ? t('common.yes') : t('common.no')}
				/>
				<ApprovalDetail
					label={t('teamReview.approvals.detail.requested')}
					value={requestedAt}
				/>
			</div>

			{request.reason.trim() !== '' && (
				<section className="campfire-approval-note-panel campfire-approval-note-panel--compact">
					<p className="campfire-approval-field-label">{t('teamReview.approvals.detail.reason')}</p>
					<p className="campfire-approval-note-text">
						<CampfireBidiText>{request.reason}</CampfireBidiText>
					</p>
				</section>
			)}

			<ApprovalComment
				id={`campfire-approval-comment-${request.id}`}
				disabled={props.disabled}
				placeholder={t('teamReview.approvals.comment.placeholder')}
				value={props.comment}
				onValueChange={props.onCommentChange}
			/>

			<footer className="campfire-approval-decision-actions campfire-approval-decision-actions--compact">
				<Button
					type="button"
					variant="secondary"
					disabled={props.disabled}
					onClick={() => void props.onCancel()}
				>
					<Ban className="cf:size-4" />
					{t('myDay.leave.action.cancel')}
				</Button>

				<Button
					type="button"
					variant="secondary"
					disabled={props.disabled}
					onClick={() => void props.onDecision('rejected')}
				>
					<ThumbsDown className="cf:size-4" />
					{t('teamReview.approvals.action.reject')}
				</Button>

				<Button
					type="button"
					disabled={props.disabled}
					onClick={() => void props.onDecision('approved')}
				>
					<ThumbsUp className="cf:size-4" />
					{t('teamReview.approvals.action.approve')}
				</Button>
			</footer>
		</article>
	);
}

/**
 * TeamLeaveChangeApprovalCard renders one pending member-requested leave edit.
 */
function TeamLeaveChangeApprovalCard(props: {
	readonly item: PendingLeaveChangeRequest;
	readonly comment: string;
	readonly disabled: boolean;
	readonly timezone: string;
	readonly labelForUserID: (userID: string) => string;
	readonly onCommentChange: (comment: string) => void;
	readonly onDecision: (decision: LeaveDecision) => Promise<void>;
}): ReactElement {
	const { htmlLang, t } = useI18n();
	const request = props.item.changeRequest;
	const requesterLabel = props.labelForUserID(request.requesterUserId);
	const backupLabel = request.backupUserId.trim() === ''
		? t('common.notSet')
		: props.labelForUserID(request.backupUserId);
	const requestedAt = formatWorkspaceDateTime(request.createdAt, props.timezone, htmlLang, t('common.unknown'));
	const localizedRange = formatLocalizedApprovalRange(request.startDate, request.endDate, props.timezone, htmlLang, t('common.unknown'));
	const localizedLeaveType = localizedLeaveTypeName({ code: '', name: props.item.leaveTypeName }, t);
	const isDeleteRequest = request.action === 'delete';
	const cardTitleKey = isDeleteRequest ? 'teamReview.approvals.delete.cardTitle' : 'teamReview.approvals.change.cardTitle';
	const statusKey = isDeleteRequest ? 'teamReview.approvals.delete.status' : 'teamReview.approvals.change.status';
	const commentPlaceholderKey = isDeleteRequest ? 'teamReview.approvals.delete.commentPlaceholder' : 'teamReview.approvals.change.commentPlaceholder';
	const rejectKey = isDeleteRequest ? 'teamReview.approvals.delete.reject' : 'teamReview.approvals.change.reject';
	const approveKey = isDeleteRequest ? 'teamReview.approvals.delete.approve' : 'teamReview.approvals.change.approve';

	return (
		<article className={approvalCardClassName()}>
			<header className="campfire-approval-card-header">
				<div className="campfire-approval-identity">
					<CampfireUserAvatar
						userID={request.requesterUserId}
						displayName={requesterLabel}
						username={requesterLabel}
						className="campfire-approval-user-avatar"
					/>
					<div className="campfire-approval-identity-copy">
						<p className="campfire-approval-requester-label">
							{t(cardTitleKey)}
						</p>
						<h3 className="campfire-approval-requester-name">
							<CampfireBidiText>{requesterLabel}</CampfireBidiText>
						</h3>
					</div>
				</div>

				<CampfireStatusPill tone="ember">
					{t(statusKey)}
				</CampfireStatusPill>
			</header>

			<div className="campfire-approval-primary-row">
				<ApprovalDetail
					icon={<CalendarDays className="cf:size-4" />}
					label={t('teamReview.approvals.detail.dateRange')}
					value={localizedRange}
				/>
				<ApprovalDetail
					icon={<Clock3 className="cf:size-4" />}
					label={t('teamReview.approvals.detail.duration')}
					value={formatLocalizedLeaveChangeDurationDetails(request, t)}
				/>
			</div>

			<div className="campfire-approval-detail-grid campfire-approval-detail-grid--minimal">
				<ApprovalDetail
					label={t('myDay.leave.field.leaveType')}
					value={localizedLeaveType}
				/>
				<ApprovalDetail
					label={t('teamReview.approvals.detail.mode')}
					value={t(leaveDurationModeTranslationKey(request.durationMode))}
				/>
				<ApprovalDetail label={t('teamReview.approvals.detail.backup')} value={backupLabel} />
				<ApprovalDetail
					label={t('teamReview.approvals.detail.canContact')}
					value={request.canContactIfNeeded ? t('common.yes') : t('common.no')}
				/>
				<ApprovalDetail
					label={t('teamReview.approvals.detail.requested')}
					value={requestedAt}
				/>
			</div>

			{request.reason.trim() !== '' && (
				<section className="campfire-approval-note-panel campfire-approval-note-panel--compact">
					<p className="campfire-approval-field-label">{t('teamReview.approvals.detail.reason')}</p>
					<p className="campfire-approval-note-text">
						<CampfireBidiText>{request.reason}</CampfireBidiText>
					</p>
				</section>
			)}

			<ApprovalComment
				id={`campfire-change-approval-comment-${request.id}`}
				disabled={props.disabled}
				placeholder={t(commentPlaceholderKey)}
				value={props.comment}
				onValueChange={props.onCommentChange}
			/>

			<footer className="campfire-approval-decision-actions campfire-approval-decision-actions--compact">
				<Button
					type="button"
					variant="secondary"
					disabled={props.disabled}
					onClick={() => void props.onDecision('rejected')}
				>
					<ThumbsDown className="cf:size-4" />
					{t(rejectKey)}
				</Button>

				<Button
					type="button"
					disabled={props.disabled}
					onClick={() => void props.onDecision('approved')}
				>
					<ThumbsUp className="cf:size-4" />
					{t(approveKey)}
				</Button>
			</footer>
		</article>
	);
}

/**
 * formatLocalizedApprovalRange formats one approval-card date range in UI locale.
 */
function formatLocalizedApprovalRange(
	startDate: string,
	endDate: string,
	timezone: string,
	locale: string,
	fallback: string,
): string {
	const formattedStart = formatWorkspaceLocalDate(startDate, timezone, locale, fallback);
	if (startDate === endDate) {
		return formattedStart;
	}

	return `${formattedStart} → ${formatWorkspaceLocalDate(endDate, timezone, locale, fallback)}`;
}

/**
 * formatLocalizedLeaveChangeDurationDetails formats mode-specific edit-request duration details.
 */
function formatLocalizedLeaveChangeDurationDetails(
	request: LeaveChangeRequest,
	translate: Parameters<typeof formatLocalizedLeaveDurationDetails>[1],
): string {
	if (request.durationMode === 'hourly') {
		if (request.startTime.trim() === '' || request.endTime.trim() === '') {
			return translate('myDay.leave.duration.hourly');
		}

		return translate('myDay.leave.duration.hourlyRange', {
			startTime: request.startTime,
			endTime: request.endTime,
		});
	}

	return translate(leaveDurationModeTranslationKey(request.durationMode));
}

/**
 * ApprovalDetail renders one approval metadata tile.
 */
function ApprovalDetail(props: {
	readonly icon?: ReactElement;
	readonly label: string;
	readonly value: string;
}): ReactElement {
	return (
		<div className="campfire-approval-detail-tile">
			<div className="campfire-approval-detail-label-row">
				{props.icon !== undefined && <span className="campfire-approval-detail-icon">{props.icon}</span>}
				<p className="campfire-approval-field-label">{props.label}</p>
			</div>
			<p className="campfire-approval-detail-value" title={props.value}>
				<CampfireBidiText>{props.value}</CampfireBidiText>
			</p>
		</div>
	);
}

/**
 * ApprovalComment renders the approver note input.
 */
function ApprovalComment(props: {
	readonly id: string;
	readonly disabled: boolean;
	readonly placeholder: string;
	readonly value: string;
	readonly onValueChange: (value: string) => void;
}): ReactElement {
	const { t } = useI18n();

	return (
		<section className="campfire-approval-comment-block campfire-approval-comment-block--compact">
			<label
				htmlFor={props.id}
				className="campfire-approval-comment-label"
			>
				<MessageSquareText
					className="campfire-approval-comment-icon"
					aria-hidden="true"
				/>
				<span>{t('teamReview.approvals.comment.label')}</span>
			</label>

			<CampfireResponsiveTextarea
				id={props.id}
				disabled={props.disabled}
				placeholder={props.placeholder}
				value={props.value}
				onValueChange={props.onValueChange}
			/>
		</section>
	);
}
