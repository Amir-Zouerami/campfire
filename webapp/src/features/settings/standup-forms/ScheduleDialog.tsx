import type { ReactElement } from 'react';
import * as z from 'zod/mini';

import { msg, submitForm, useAppForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import type { StandupKind, StandupSchedule } from '@/shared/types/domain';
import { Grid, Modal, Notice, Stack } from '@/shared/ui';

import { opensBeforeCloses, scheduleRequest, scheduleValuesOf, STANDUP_KINDS } from './standupForms';
import type { ScheduleValues } from './standupForms';
import { useStandupMutations } from './useStandupMutations';

const schema = z
	.object({
		kind: z.enum(['daily', 'weekly', 'custom']),
		enabled: z.boolean(),
		opensAt: z.string().check(z.minLength(1, msg('settings.standups.validation.scheduleOpenRequired'))),
		timeOfDay: z.string().check(z.minLength(1, msg('settings.standups.validation.scheduleCloseRequired'))),
		skipNonWorkingDays: z.boolean(),
		weeklyMode: z.enum(['none', 'last_working_day']),
	})
	.check(
		z.superRefine((value, context) => {
			if (value.opensAt !== '' && value.timeOfDay !== '' && !opensBeforeCloses(value.opensAt, value.timeOfDay)) {
				context.addIssue({ code: 'custom', path: ['timeOfDay'], message: msg('settings.standups.validation.scheduleOpenBeforeClose') });
			}
		}),
	);

type ScheduleDialogProps = {
	readonly open: boolean;
	readonly onClose: () => void;
	readonly templateID: string;
	/** The schedule being edited, or null to add a new one. */
	readonly schedule: StandupSchedule | null;
};

/**
 * ScheduleDialog adds or edits when a template's standup opens and when it closes and reports.
 * Mount it with a `key` per schedule so the form starts from that schedule's values.
 */
export function ScheduleDialog(props: ScheduleDialogProps): ReactElement {
	const { t } = useI18n();
	const { createSchedule, updateSchedule } = useStandupMutations();
	const editing = props.schedule;

	const defaults: ScheduleValues =
		editing === null
			? { kind: 'daily', enabled: true, opensAt: '09:30', timeOfDay: '10:00', skipNonWorkingDays: true, weeklyMode: 'none' }
			: scheduleValuesOf(editing);

	const form = useAppForm({
		defaultValues: defaults,
		validators: { onChange: schema, onSubmit: schema },
		onSubmit: async ({ value }) => {
			const request = scheduleRequest(props.templateID, value);
			if (editing === null) {
				await createSchedule.mutateAsync(request);
			} else {
				await updateSchedule.mutateAsync({ id: editing.id, request });
			}

			props.onClose();
		},
	});

	return (
		<Modal
			open={props.open}
			size="md"
			title={editing === null ? t('settings.standups.schedules.new.title') : t('settings.standups.schedule.eyebrow')}
			description={editing === null ? t('settings.standups.schedules.new.description') : undefined}
			onClose={props.onClose}
			onSubmit={() => submitForm(form)}
			footer={
				<form.AppForm>
					<form.SubmitButton
						label={editing === null ? t('settings.standups.actions.createSchedule') : t('settings.standups.actions.saveSchedule')}
					/>
				</form.AppForm>
			}
		>
			<Stack gap={4}>
				<form.AppField name="kind">
					{field => (
						<field.SelectField
							label={t('settings.standups.fields.kind')}
							options={STANDUP_KINDS.map((kind: StandupKind) => ({ value: kind, label: t(`settings.standups.kind.${kind}`) }))}
						/>
					)}
				</form.AppField>
				<Grid columns={2}>
					<form.AppField name="opensAt">
						{field => <field.TimePickerField required label={t('settings.standups.fields.opens')} />}
					</form.AppField>
					<form.AppField name="timeOfDay">
						{field => <field.TimePickerField required label={t('settings.standups.fields.closesReport')} />}
					</form.AppField>
				</Grid>
				<form.Subscribe selector={state => state.values.kind}>
					{kind =>
						kind === 'weekly' ? (
							<form.AppField name="weeklyMode">
								{field => (
									<field.SelectField
										label={t('settings.standups.fields.weeklyMode')}
										description={t('settings.standups.fields.weeklyMode.description')}
										options={[
											{ value: 'none', label: t('common.none') },
											{ value: 'last_working_day', label: t('settings.standups.fields.weeklyMode.lastWorkingDay') },
										]}
									/>
								)}
							</form.AppField>
						) : null
					}
				</form.Subscribe>
				<Stack gap={0}>
					<form.AppField name="enabled">
						{field => (
							<field.SwitchField
								label={t('settings.standups.fields.enabled')}
								description={t('settings.standups.fields.enabled.description')}
							/>
						)}
					</form.AppField>
					<form.AppField name="skipNonWorkingDays">
						{field => (
							<field.SwitchField
								label={t('settings.standups.fields.skipNonWorkingDays')}
								description={t('settings.standups.fields.skipNonWorkingDays.description')}
							/>
						)}
					</form.AppField>
				</Stack>
				<Notice title={t('settings.standups.schedule.independentNotice.title')}>
					{t('settings.standups.schedule.independentNotice.description')}
				</Notice>
			</Stack>
		</Modal>
	);
}
