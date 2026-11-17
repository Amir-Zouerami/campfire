import { useQuery } from '@tanstack/react-query';

import { listApprovedLeaveRequests } from '@/shared/api';
import { isSelectableLeaveType, leaveKeys, leaveTypeName } from '@/shared/data/leave';
import { withForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import type { TFunction } from '@/shared/i18n';
import { useWorkspaceID } from '@/shared/session';
import { Grid, Notice, Stack } from '@/shared/ui';
import type { LeaveType, PendingLeaveRequest } from '@/shared/types/domain';

import { emptyLeaveDraft, leavesOverlap } from '@/shared/data/leaveDraft';

type LeaveWarningsProps = {
	readonly startDate: string;
	readonly endDate: string;
	readonly ownLeaves: readonly PendingLeaveRequest[];
	/** An existing request being edited does not conflict with itself. */
	readonly ignoreLeaveID?: string;
};

/**
 * LeaveWarnings shows non-blocking heads-up messages while the dates are being chosen:
 * the range overlaps the member's own requests or other people's approved leave.
 */
function LeaveWarnings(props: LeaveWarningsProps) {
	const { t } = useI18n();
	const workspaceID = useWorkspaceID();
	const hasRange = props.startDate !== '' && props.endDate !== '' && props.endDate >= props.startDate;

	const approved = useQuery({
		queryKey: leaveKeys.approved(workspaceID, props.startDate, props.endDate),
		queryFn: () => listApprovedLeaveRequests(workspaceID, props.startDate, props.endDate),
		enabled: hasRange,
		staleTime: 30_000,
	});

	if (!hasRange) {
		return null;
	}

	const ownOverlap = props.ownLeaves.some(
		item => item.leaveRequest.id !== props.ignoreLeaveID && leavesOverlap(props.startDate, props.endDate, item.leaveRequest),
	);
	const approvedCount = approved.data?.leaveRequests.length ?? 0;

	return (
		<>
			{ownOverlap && <Notice tone="warning">{t('myDay.leave.warning.ownOverlap')}</Notice>}
			{approvedCount > 0 && (
				<Notice tone="warning">
					{approvedCount === 1
						? t('myDay.leave.warning.approvedOverlapOne')
						: t('myDay.leave.warning.approvedOverlapMany', { count: approvedCount })}
				</Notice>
			)}
		</>
	);
}

/**
 * LeaveRequestFields is the one leave form body, used to request leave and to edit it.
 * It binds to a form whose values are a LeaveDraft.
 */
export const LeaveRequestFields = withForm({
	defaultValues: emptyLeaveDraft('', ''),
	props: {
		leaveTypes: [] as readonly LeaveType[],
		ownLeaves: [] as readonly PendingLeaveRequest[],
		ignoreLeaveID: undefined as string | undefined,
		keepTypeID: undefined as string | undefined,
		t: (() => '') as TFunction,
		today: '',
	},
	render: ({ form, leaveTypes, ownLeaves, ignoreLeaveID, keepTypeID, t, today }) => {
		return (
			<Stack gap={5}>
				<Grid columns={2}>
					<form.AppField name="leaveTypeId">
						{field => (
							<field.SelectField
								required
								label={t('myDay.leave.field.leaveType')}
								placeholder={t('myDay.leave.field.leaveType.placeholder')}
								options={leaveTypes
									.filter(type => isSelectableLeaveType(type) || type.id === keepTypeID)
									.map(type => ({ value: type.id, label: leaveTypeName(t, type) }))}
							/>
						)}
					</form.AppField>
					<form.AppField name="durationMode">
						{field => (
							<field.ChoiceField
								variant="segmented"
								label={t('myDay.leave.field.duration')}
								options={[
									{ value: 'full_day', label: t('myDay.leave.duration.fullDay') },
									{ value: 'hourly', label: t('myDay.leave.duration.hourly') },
								]}
							/>
						)}
					</form.AppField>
				</Grid>

				<Grid columns={2}>
					<form.AppField name="startDate">
						{field => <field.DatePickerField required label={t('myDay.leave.field.startDate')} min={today} />}
					</form.AppField>
					<form.AppField name="endDate">
						{field => <field.DatePickerField required label={t('myDay.leave.field.endDate')} min={today} />}
					</form.AppField>
				</Grid>

				<form.Subscribe selector={state => state.values.durationMode}>
					{mode =>
						mode === 'hourly' ? (
							<Grid columns={2}>
								<form.AppField name="startTime">
									{field => <field.TimePickerField required label={t('myDay.leave.field.startTime')} />}
								</form.AppField>
								<form.AppField name="endTime">
									{field => <field.TimePickerField required label={t('myDay.leave.field.endTime')} />}
								</form.AppField>
							</Grid>
						) : null
					}
				</form.Subscribe>

				<form.Subscribe selector={state => ({ startDate: state.values.startDate, endDate: state.values.endDate })}>
					{range => (
						<LeaveWarnings startDate={range.startDate} endDate={range.endDate} ownLeaves={ownLeaves} ignoreLeaveID={ignoreLeaveID} />
					)}
				</form.Subscribe>

				<form.AppField name="backupUserId">
					{field => (
						<field.TextField
							ltr
							label={t('myDay.leave.field.backupUserId')}
							placeholder={t('myDay.leave.field.backupUserId.placeholder')}
						/>
					)}
				</form.AppField>
				<form.AppField name="canContactIfNeeded">
					{field => (
						<field.BooleanChoiceField
							label={t('myDay.leave.field.canContact.label')}
							description={t('myDay.leave.field.canContact.description')}
							yesLabel={t('common.yes')}
							noLabel={t('common.no')}
						/>
					)}
				</form.AppField>
				<form.AppField name="reason">
					{field => (
						<field.TextAreaField
							userContent
							label={t('myDay.leave.field.reason')}
							placeholder={t('myDay.leave.field.reason.placeholder')}
						/>
					)}
				</form.AppField>
			</Stack>
		);
	},
});
