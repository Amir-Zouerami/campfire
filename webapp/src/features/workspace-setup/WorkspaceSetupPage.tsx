import { useMutation } from '@tanstack/react-query';
import { Flame } from 'lucide-react';
import type { ReactElement } from 'react';
import * as z from 'zod/mini';

import { createWorkspace } from '@/shared/api';
import { msg, submitForm, useAppForm } from '@/shared/forms';
import { browserTimezone, inferLanguageFromTimezone, orderedWeekdays, useI18n, weekdayLabel } from '@/shared/i18n';
import type { CampfireLanguage } from '@/shared/i18n';
import { Container, Field, PageHeader, Section, Stack, Text, WeekdayChips, toast } from '@/shared/ui';

type WorkspaceSetupPageProps = {
	readonly channelID: string;
	readonly channelName: string | null;
	readonly teamID: string;
	/** Called after the workspace exists so the app can load it. */
	readonly onCreated: () => void;
};

const schema = z.object({
	name: z.string().check(z.trim(), z.minLength(1, msg('setup.error.nameRequired'))),
	description: z.string(),
	boardUrl: z.string(),
	timezone: z.string().check(z.trim(), z.minLength(1, msg('setup.error.timezoneRequired'))),
	language: z.enum(['english', 'persian', 'arabic']),
	workingDays: z.array(z.number()).check(z.minLength(1, msg('setup.error.workingDayRequired'))),
	channelAdminsAreLeads: z.boolean(),
	createDefaultTemplates: z.boolean(),
});

/**
 * WorkspaceSetupPage turns a Mattermost channel into a Campfire workspace.
 */
export function WorkspaceSetupPage(props: WorkspaceSetupPageProps): ReactElement {
	const { t } = useI18n();
	const timezone = browserTimezone();

	const create = useMutation({
		mutationFn: createWorkspace,
		onSuccess: () => {
			toast.success(t('setup.success.created'));
			props.onCreated();
		},
	});

	const form = useAppForm({
		defaultValues: {
			name: props.channelName === null ? t('setup.name.default') : t('setup.name.fromChannel', { channelName: props.channelName }),
			description: '',
			boardUrl: '',
			timezone,
			language: inferLanguageFromTimezone(timezone) as CampfireLanguage,
			workingDays: [1, 2, 3, 4, 5] as readonly number[],
			channelAdminsAreLeads: true,
			createDefaultTemplates: true,
		},
		validators: { onChange: schema, onSubmit: schema },
		onSubmit: async ({ value }) => {
			await create.mutateAsync({
				teamId: props.teamID,
				channelId: props.channelID,
				name: value.name.trim(),
				description: value.description.trim(),
				boardUrl: value.boardUrl.trim(),
				timezone: value.timezone.trim(),
				workingDays: [...value.workingDays].sort((first, second) => first - second),
				channelAdminsAreLeads: value.channelAdminsAreLeads,
				namedLeadUserIds: [],
				namedApproverUserIds: [],
				createDefaultTemplates: value.createDefaultTemplates,
				generatedMessageLanguage: value.language,
			});
		},
	});

	return (
		<Container width="narrow" centered>
			<PageHeader eyebrow={t('setup.page.eyebrow')} title={t('setup.page.title')} description={t('setup.page.description')} />

			<form
				noValidate
				onSubmit={event => {
					event.preventDefault();
					submitForm(form);
				}}
			>
				<Stack gap={8}>
					<Section divided title={t('setup.surface.identity.title')} description={t('setup.surface.identity.description')}>
						<Stack gap={4}>
							<form.AppField name="name">{field => <field.TextField required userContent label={t('setup.name.label')} />}</form.AppField>
							<form.AppField name="description">
								{field => (
									<field.TextAreaField
										userContent
										rows={2}
										label={t('setup.description.label')}
										placeholder={t('setup.description.placeholder')}
									/>
								)}
							</form.AppField>
							<form.AppField name="boardUrl">
								{field => <field.TextField ltr label={t('setup.boardUrl.label')} placeholder={t('setup.boardUrl.placeholder')} />}
							</form.AppField>
						</Stack>
					</Section>

					<Section divided title={t('setup.workingCalendar.title')} description={t('setup.workingCalendar.description')}>
						<Stack gap={4}>
							<form.AppField
								name="timezone"
								listeners={{ onChange: ({ value }) => form.setFieldValue('language', inferLanguageFromTimezone(value)) }}
							>
								{field => <field.TimezoneField required label={t('setup.timezone.label')} />}
							</form.AppField>
							<form.AppField name="language">
								{field => (
									<field.SelectField
										label={t('setup.field.language.label')}
										description={t('setup.field.language.helper')}
										options={[
											{ value: 'english', label: t('common.english') },
											{ value: 'persian', label: t('common.persian') },
											{ value: 'arabic', label: t('common.arabic') },
										]}
									/>
								)}
							</form.AppField>
							<form.Subscribe selector={state => state.values.workingDays}>
								{days => (
									<Field group label={t('setup.stat.workingDays.label')} required>
										<WeekdayChips
											label={t('setup.stat.workingDays.label')}
											days={orderedWeekdays(1).map(weekday => ({
												weekday,
												label: weekdayLabel(t, weekday, 'short'),
												state: days.includes(weekday) ? 'on' : 'inactive',
											}))}
											onToggle={weekday =>
												form.setFieldValue('workingDays', days.includes(weekday) ? days.filter(day => day !== weekday) : [...days, weekday])
											}
										/>
										<Text size="sm" tone="muted">
											{t('setup.stat.workingDays.value', { count: days.length })}
										</Text>
									</Field>
								)}
							</form.Subscribe>
						</Stack>
					</Section>

					<Section divided title={t('setup.surface.roles.title')} description={t('setup.surface.roles.description')}>
						<Stack gap={2}>
							<form.AppField name="channelAdminsAreLeads">
								{field => <field.SwitchField label={t('setup.roleAdmins.title')} description={t('setup.roleAdmins.description')} />}
							</form.AppField>
							<form.AppField name="createDefaultTemplates">
								{field => (
									<field.SwitchField label={t('setup.templateDefaults.title')} description={t('setup.templateDefaults.description')} />
								)}
							</form.AppField>
						</Stack>
					</Section>

					<Section divided title={t('setup.submit.title')} description={t('setup.submit.description')}>
						<form.AppForm>
							<form.SubmitButton icon={Flame} label={t('setup.createButton')} />
						</form.AppForm>
					</Section>
				</Stack>
			</form>
		</Container>
	);
}
