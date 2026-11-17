import { useState } from 'react';
import type { ReactElement } from 'react';

import { leaveTypeName } from '@/shared/data/leave';
import { useI18n } from '@/shared/i18n';
import type { TranslationKey } from '@/shared/i18n';
import { useWorkspaceSession } from '@/shared/session';
import { UserLabel, UserName } from '@/shared/users';
import { Button, DescriptionList, Field, Inline, Stack, StatusText, TextArea, toast } from '@/shared/ui';

import type { ApprovalItem } from './approvalItems';
import { useApprovalDecisions } from './useApprovals';

/**
 * COPY holds the wording that differs between the three queues.
 */
const COPY: Record<
	ApprovalItem['kind'],
	{
		readonly status: TranslationKey;
		readonly placeholder: TranslationKey;
		readonly approve: TranslationKey;
		readonly reject: TranslationKey;
		readonly approved: TranslationKey;
		readonly rejected: TranslationKey;
	}
> = {
	new: {
		status: 'myDay.leave.status.pending',
		placeholder: 'teamReview.approvals.comment.placeholder',
		approve: 'teamReview.approvals.action.approve',
		reject: 'teamReview.approvals.action.reject',
		approved: 'teamReview.approvals.toast.approved',
		rejected: 'teamReview.approvals.toast.rejected',
	},
	edit: {
		status: 'teamReview.approvals.change.status',
		placeholder: 'teamReview.approvals.change.commentPlaceholder',
		approve: 'teamReview.approvals.change.approve',
		reject: 'teamReview.approvals.change.reject',
		approved: 'teamReview.approvals.toast.changeApproved',
		rejected: 'teamReview.approvals.toast.changeRejected',
	},
	delete: {
		status: 'teamReview.approvals.delete.status',
		placeholder: 'teamReview.approvals.delete.commentPlaceholder',
		approve: 'teamReview.approvals.delete.approve',
		reject: 'teamReview.approvals.delete.reject',
		approved: 'teamReview.approvals.toast.changeApproved',
		rejected: 'teamReview.approvals.toast.changeRejected',
	},
};

type ApprovalDetailProps = {
	readonly item: ApprovalItem;
};

/**
 * ApprovalDetail shows everything an approver needs to decide one request, plus the decision controls.
 */
export function ApprovalDetail(props: ApprovalDetailProps): ReactElement {
	const { t, formatDate, formatTimestamp } = useI18n();
	const { workspace } = useWorkspaceSession();
	const { decide, remove } = useApprovalDecisions();
	const [comment, setComment] = useState('');
	const { item } = props;
	const copy = COPY[item.kind];

	const range =
		item.startDate === item.endDate ? formatDate(item.startDate) : `${formatDate(item.startDate)} → ${formatDate(item.endDate)}`;
	const duration =
		item.durationMode === 'hourly'
			? t('myDay.leave.duration.hourlyRange', { startTime: item.startTime, endTime: item.endTime })
			: t('myDay.leave.duration.fullDay');

	function submit(decision: 'approved' | 'rejected'): void {
		decide.mutate(
			{ item, decision, comment: comment.trim() },
			{ onSuccess: () => toast.success(t(decision === 'approved' ? copy.approved : copy.rejected)) },
		);
	}

	return (
		<Stack gap={6}>
			<Inline justify="between" align="center" gap={4}>
				<UserLabel userID={item.userID} size="lg" />
				<StatusText kind="pending">{t(copy.status)}</StatusText>
			</Inline>

			<DescriptionList
				items={[
					{ term: t('teamReview.approvals.detail.dateRange'), detail: range },
					{ term: t('teamReview.approvals.detail.duration'), detail: duration },
					{ term: t('myDay.leave.field.leaveType'), detail: leaveTypeName(t, { name: item.leaveTypeName }) },
					{
						term: t('teamReview.approvals.detail.mode'),
						detail: t(item.durationMode === 'hourly' ? 'myDay.leave.duration.hourly' : 'myDay.leave.duration.fullDay'),
					},
					{
						term: t('teamReview.approvals.detail.backup'),
						detail: item.backupUserID === '' ? t('common.notSet') : <UserName userID={item.backupUserID} />,
					},
					{ term: t('teamReview.approvals.detail.canContact'), detail: item.canContact ? t('common.yes') : t('common.no') },
					{ term: t('teamReview.approvals.detail.requested'), detail: formatTimestamp(item.createdAt, workspace.timezone) },
					...(item.reason.trim() === ''
						? []
						: [{ term: t('teamReview.approvals.detail.reason'), detail: <span dir="auto">{item.reason}</span> }]),
				]}
			/>

			<Field label={t('teamReview.approvals.comment.label')}>
				<TextArea value={comment} onChange={setComment} placeholder={t(copy.placeholder)} userContent />
			</Field>

			<Inline gap={3} wrap>
				<Button
					variant="secondary"
					loading={decide.isPending && decide.variables?.decision === 'rejected'}
					disabled={decide.isPending || remove.isPending}
					onClick={() => submit('rejected')}
				>
					{t(copy.reject)}
				</Button>
				<Button
					loading={decide.isPending && decide.variables?.decision === 'approved'}
					disabled={decide.isPending || remove.isPending}
					onClick={() => submit('approved')}
				>
					{t(copy.approve)}
				</Button>
				{item.kind === 'new' && (
					<Button variant="ghost" disabled={decide.isPending || remove.isPending} onClick={() => remove.mutate(item.decisionID)}>
						{t('myDay.leave.action.cancel')}
					</Button>
				)}
			</Inline>
		</Stack>
	);
}
