import type { ReactElement } from 'react';
import { useState } from 'react';

import { leaveDurationText, leaveRangeText, leaveStatusKey, leaveStatusKind, leaveTypeName } from '@/shared/data/leave';
import { useI18n } from '@/shared/i18n';
import { useWorkspaceSession } from '@/shared/session';
import { UserName } from '@/shared/users';
import { Button, EmptyState, ListRow, ListRows, Notice, Stack, StatusText, Text } from '@/shared/ui';
import type { LeaveType, PendingLeaveRequest } from '@/shared/types/domain';

import { EditLeaveDialog } from './EditLeaveDialog';
import { approvedLeaveHasStarted } from '@/shared/data/leaveDraft';
import { useLeaveActions } from './useLeaveActions';

type ActiveLeaveListProps = {
	readonly leaves: readonly PendingLeaveRequest[];
	readonly leaveTypes: readonly LeaveType[];
};

/**
 * ActiveLeaveList shows the member's pending and approved leave with the actions each allows:
 * pending leave can be edited or deleted directly; approved leave needs an edit request, and
 * once it has started it can only be removed through a deletion request.
 */
export function ActiveLeaveList(props: ActiveLeaveListProps): ReactElement {
	const { t } = useI18n();
	const { workspace } = useWorkspaceSession();
	const actions = useLeaveActions(props.leaves);
	const [editing, setEditing] = useState<{ readonly leave: PendingLeaveRequest; readonly mode: 'direct' | 'request' } | null>(null);

	if (props.leaves.length === 0) {
		return <EmptyState title={t('myDay.leave.empty.active.title')} description={t('myDay.leave.empty.active.description')} />;
	}

	return (
		<>
			<ListRows label={t('myDay.leave.active.title')}>
				{props.leaves.map(item => {
					const leave = item.leaveRequest;
					const pending = leave.status === 'pending';
					const started = approvedLeaveHasStarted(leave, workspace.timezone);
					const busy = actions.cancel.isPending || actions.requestDeletion.isPending;

					return (
						<ListRow
							key={leave.id}
							title={leaveRangeText(leave)}
							subtitle={`${leaveTypeName(t, { name: item.leaveTypeName })} · ${leaveDurationText(t, leave)}`}
							detail={
								<Stack gap={2}>
									<Text size="sm" tone="muted">
										{leave.backupUserId !== '' && (
											<>
												{t('myDay.leave.meta.backup')}: <UserName userID={leave.backupUserId} />
												{' · '}
											</>
										)}
										{t('myDay.leave.meta.canContact')}: {leave.canContactIfNeeded ? t('common.yes') : t('common.no')}
										{leave.reason.trim() !== '' && (
											<>
												{' · '}
												{t('myDay.leave.meta.reason')}: <span dir="auto">{leave.reason}</span>
											</>
										)}
									</Text>
									{started && <Notice>{t('myDay.leave.cancel.locked')}</Notice>}
								</Stack>
							}
							trailing={
								<>
									<StatusText kind={leaveStatusKind(leave.status)}>{t(leaveStatusKey(leave.status))}</StatusText>
									<Button size="sm" variant="secondary" onClick={() => setEditing({ leave: item, mode: pending ? 'direct' : 'request' })}>
										{pending ? t('myDay.leave.editDirect.open') : t('myDay.leave.editRequest.open')}
									</Button>
									{started ? (
										<Button size="sm" variant="secondary" disabled={busy} onClick={() => actions.requestDeletion.mutate(leave.id)}>
											{t('myDay.leave.action.requestDelete')}
										</Button>
									) : (
										<Button size="sm" variant="secondary" disabled={busy} onClick={() => actions.cancel.mutate(leave.id)}>
											{t('myDay.leave.action.cancel')}
										</Button>
									)}
								</>
							}
						/>
					);
				})}
			</ListRows>
			{editing !== null && (
				<EditLeaveDialog
					key={editing.leave.leaveRequest.id}
					leave={editing.leave}
					mode={editing.mode}
					leaveTypes={props.leaveTypes}
					activeLeaves={props.leaves}
					onClose={() => setEditing(null)}
				/>
			)}
		</>
	);
}
