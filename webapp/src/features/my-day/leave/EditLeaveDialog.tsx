import type { ReactElement } from 'react';

import { submitForm, useAppForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { useToday } from '@/shared/session';
import { Modal } from '@/shared/ui';
import type { LeaveType, PendingLeaveRequest } from '@/shared/types/domain';

import { draftFromLeave, leaveDraftSchema } from '@/shared/data/leaveDraft';
import { LeaveRequestFields } from './LeaveRequestFields';
import { useLeaveActions } from './useLeaveActions';

type EditLeaveDialogProps = {
	/** The request being changed. */
	readonly leave: PendingLeaveRequest;
	/** `direct` saves a pending request in place; `request` asks approvers to approve a change to approved leave. */
	readonly mode: 'direct' | 'request';
	readonly leaveTypes: readonly LeaveType[];
	readonly activeLeaves: readonly PendingLeaveRequest[];
	readonly onClose: () => void;
};

/**
 * EditLeaveDialog changes an existing leave request. Pending leave is edited directly; approved
 * leave is never changed immediately, only a change request is sent for an approver to decide.
 */
export function EditLeaveDialog(props: EditLeaveDialogProps): ReactElement {
	const { t } = useI18n();
	const today = useToday();
	const { editPending, requestEdit } = useLeaveActions(props.activeLeaves);
	const direct = props.mode === 'direct';
	const leaveRequestID = props.leave.leaveRequest.id;

	const form = useAppForm({
		defaultValues: draftFromLeave(props.leave.leaveRequest),
		validators: { onChange: leaveDraftSchema, onSubmit: leaveDraftSchema },
		onSubmit: async ({ value }) => {
			await (direct ? editPending : requestEdit).mutateAsync({ leaveRequestID, draft: value });
			props.onClose();
		},
	});

	return (
		<Modal
			open
			size="md"
			title={direct ? t('myDay.leave.editDirect.title') : t('myDay.leave.editRequest.title')}
			description={direct ? t('myDay.leave.editDirect.description') : t('myDay.leave.editRequest.description')}
			onClose={props.onClose}
			onSubmit={() => submitForm(form)}
			footer={
				<form.AppForm>
					<form.SubmitButton label={direct ? t('myDay.leave.editDirect.submit') : t('myDay.leave.editRequest.submit')} />
				</form.AppForm>
			}
		>
			<LeaveRequestFields
				form={form}
				leaveTypes={props.leaveTypes}
				ownLeaves={props.activeLeaves}
				ignoreLeaveID={leaveRequestID}
				keepTypeID={props.leave.leaveRequest.leaveTypeId}
				t={t}
				today={today}
			/>
		</Modal>
	);
}
