import { Send } from 'lucide-react';
import type { ReactElement } from 'react';

import { isSelectableLeaveType } from '@/shared/data/leave';
import { submitForm, useAppForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { useToday } from '@/shared/session';
import { EmptyState } from '@/shared/ui';
import type { LeaveType, PendingLeaveRequest } from '@/shared/types/domain';

import { emptyLeaveDraft, leaveDraftSchema } from '@/shared/data/leaveDraft';
import { LeaveRequestFields } from './LeaveRequestFields';
import { useLeaveActions } from './useLeaveActions';

type NewLeaveRequestProps = {
	readonly leaveTypes: readonly LeaveType[];
	readonly activeLeaves: readonly PendingLeaveRequest[];
};

/**
 * NewLeaveRequest is the form for asking for leave. Sending it notifies approvers by direct
 * message (done by the server) and the member gets a confirmation message.
 */
export function NewLeaveRequest(props: NewLeaveRequestProps): ReactElement {
	const { t } = useI18n();
	const today = useToday();
	const { create } = useLeaveActions(props.activeLeaves);
	const firstType = props.leaveTypes.find(isSelectableLeaveType);

	const form = useAppForm({
		defaultValues: emptyLeaveDraft(today, firstType?.id ?? ''),
		validators: { onChange: leaveDraftSchema, onSubmit: leaveDraftSchema },
		onSubmit: async ({ value, formApi }) => {
			await create.mutateAsync(value);
			formApi.reset(emptyLeaveDraft(today, value.leaveTypeId));
		},
	});

	if (firstType === undefined) {
		return <EmptyState title={t('myDay.leave.empty.types.title')} description={t('myDay.leave.empty.types.description')} />;
	}

	return (
		<form
			noValidate
			onSubmit={event => {
				event.preventDefault();
				submitForm(form);
			}}
		>
			<LeaveRequestFields
				form={form}
				leaveTypes={props.leaveTypes}
				ownLeaves={props.activeLeaves}
				ignoreLeaveID={undefined}
				keepTypeID={undefined}
				t={t}
				today={today}
			/>
			<form.AppForm>
				<form.SubmitButton icon={Send} label={t('myDay.leave.action.request')} />
			</form.AppForm>
		</form>
	);
}
