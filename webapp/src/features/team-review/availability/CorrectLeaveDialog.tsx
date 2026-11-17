import type { ReactElement } from 'react';

import { draftFromLeave, leaveDraftSchema } from '@/shared/data/leaveDraft';
import { submitForm, useAppForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { Grid, Modal, Stack } from '@/shared/ui';
import type { ApprovedLeaveRequest } from '@/shared/types/domain';

import { useLeaveCorrections } from './useTeamAvailability';

type CorrectLeaveDialogProps = {
	readonly leave: ApprovedLeaveRequest;
	readonly onClose: () => void;
};

/**
 * CorrectLeaveDialog lets an approver fix the dates or hours of approved leave. Everything else
 * about the request (type, backup, notes) is kept exactly as the member submitted it.
 */
export function CorrectLeaveDialog(props: CorrectLeaveDialogProps): ReactElement {
	const { t } = useI18n();
	const { correct } = useLeaveCorrections();
	const original = props.leave.leaveRequest;

	const form = useAppForm({
		defaultValues: draftFromLeave(original),
		validators: { onChange: leaveDraftSchema, onSubmit: leaveDraftSchema },
		onSubmit: async ({ value }) => {
			const hourly = value.durationMode === 'hourly';

			await correct.mutateAsync({
				leaveRequestID: original.id,
				request: {
					leaveTypeId: original.leaveTypeId,
					startDate: value.startDate,
					endDate: value.endDate,
					durationMode: value.durationMode,
					halfDayPart: '',
					startTime: hourly ? value.startTime : '',
					endTime: hourly ? value.endTime : '',
					reason: original.reason,
					backupUserId: original.backupUserId,
					canContactIfNeeded: original.canContactIfNeeded,
				},
			});
			props.onClose();
		},
	});

	return (
		<Modal
			open
			size="md"
			title={t('teamReview.availability.edit.title')}
			onClose={props.onClose}
			onSubmit={() => submitForm(form)}
			footer={
				<form.AppForm>
					<form.SubmitButton label={t('teamReview.availability.edit.save')} />
				</form.AppForm>
			}
		>
			<Stack gap={5}>
				<form.AppField name="durationMode">
					{field => (
						<field.ChoiceField
							variant="segmented"
							label={t('teamReview.availability.edit.duration')}
							options={[
								{ value: 'full_day', label: t('myDay.leave.duration.fullDay') },
								{ value: 'hourly', label: t('myDay.leave.duration.hourly') },
							]}
						/>
					)}
				</form.AppField>
				<Grid columns={2}>
					<form.AppField name="startDate">
						{field => <field.DatePickerField required label={t('teamReview.availability.edit.startDate')} />}
					</form.AppField>
					<form.AppField name="endDate">
						{field => <field.DatePickerField required label={t('teamReview.availability.edit.endDate')} />}
					</form.AppField>
				</Grid>
				<form.Subscribe selector={state => state.values.durationMode}>
					{mode =>
						mode === 'hourly' ? (
							<Grid columns={2}>
								<form.AppField name="startTime">
									{field => <field.TimePickerField required label={t('teamReview.availability.edit.startTime')} />}
								</form.AppField>
								<form.AppField name="endTime">
									{field => <field.TimePickerField required label={t('teamReview.availability.edit.endTime')} />}
								</form.AppField>
							</Grid>
						) : null
					}
				</form.Subscribe>
			</Stack>
		</Modal>
	);
}
