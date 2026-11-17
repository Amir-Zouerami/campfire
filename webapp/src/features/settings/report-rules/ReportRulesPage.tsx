import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { listReportRules, updateReportRule } from '@/shared/api';
import { scheduleInfoFor, useStandupConfiguration } from '@/shared/data/standups';
import type { ScheduleInfo } from '@/shared/data/standups';
import { reportSortOptions } from '@/shared/data/reports';
import { languageNativeName, languages, useI18n } from '@/shared/i18n';
import type { TranslationKey } from '@/shared/i18n';
import { workspaceKey } from '@/shared/query/keys';
import { useWorkspaceID } from '@/shared/session';
import type { ReportLanguage, ReportRule, ReportSortMode } from '@/shared/types/domain';
import { Button, Container, Grid, PageHeader, QueryView, Section, Select, Stack, StatusText, Switch, toast } from '@/shared/ui';

/**
 * ReportRulesPage decides what each scheduled report includes and whether it posts by itself.
 * One-off previews and manual posting live under Reports.
 */
export function ReportRulesPage(): ReactElement {
	const { t } = useI18n();
	const workspaceID = useWorkspaceID();
	const configuration = useStandupConfiguration({ includeInactive: true });
	const rules = useQuery({
		queryKey: workspaceKey(workspaceID, 'settings', 'report-rules'),
		queryFn: async () =>
			[...(await listReportRules(workspaceID)).reportRules].sort((first, second) =>
				first.reportKind === second.reportKind
					? first.scheduleId.localeCompare(second.scheduleId)
					: first.reportKind.localeCompare(second.reportKind),
			),
	});

	return (
		<Container>
			<PageHeader
				eyebrow={t('settings.reportRules.page.eyebrow')}
				title={t('settings.reportRules.page.title')}
				description={t('settings.reportRules.page.description')}
			/>
			<QueryView
				query={rules}
				loadingTitle={t('settings.reportRules.loading')}
				isEmpty={list => list.length === 0}
				empty={{ title: t('settings.reportRules.empty.title'), description: t('settings.reportRules.empty.description') }}
			>
				{list => (
					<QueryView query={configuration} loadingTitle={t('settings.reportRules.loading')}>
						{config => (
							<Stack gap={10}>
								{list.map(rule => (
									<ReportRuleForm key={`${rule.id}:${rule.updatedAt}`} rule={rule} schedule={scheduleInfoFor(config, rule.scheduleId)} />
								))}
							</Stack>
						)}
					</QueryView>
				)}
			</QueryView>
		</Container>
	);
}

/**
 * INCLUDES are the content switches of a report rule, in display order.
 */
const INCLUDES = [
	{
		field: 'includeMissing',
		label: 'settings.reportRules.field.includeMissing.label',
		description: 'settings.reportRules.field.includeMissing.description',
	},
	{
		field: 'includeOnLeave',
		label: 'settings.reportRules.field.includeOnLeave.label',
		description: 'settings.reportRules.field.includeOnLeave.description',
	},
	{
		field: 'includeTime',
		label: 'settings.reportRules.field.includeTime.label',
		description: 'settings.reportRules.field.includeTime.description',
	},
	{
		field: 'includeBlockers',
		label: 'settings.reportRules.field.includeBlockers.label',
		description: 'settings.reportRules.field.includeBlockers.description',
	},
] as const satisfies readonly { readonly field: keyof ReportRule; readonly label: TranslationKey; readonly description: TranslationKey }[];

type Draft = {
	readonly enabled: boolean;
	readonly postToChannel: boolean;
	readonly previewRequired: boolean;
	readonly sortMode: ReportSortMode;
	readonly reportLanguage: ReportLanguage;
	readonly includeOnLeave: boolean;
	readonly includeMissing: boolean;
	readonly includeTime: boolean;
	readonly includeBlockers: boolean;
};

type ReportRuleFormProps = {
	readonly rule: ReportRule;
	readonly schedule: ScheduleInfo;
};

/**
 * ReportRuleForm edits one rule. It is keyed by the rule's update time, so a saved or
 * refreshed rule resets the draft to what the server now holds.
 */
function ReportRuleForm(props: ReportRuleFormProps): ReactElement {
	const { t } = useI18n();
	const workspaceID = useWorkspaceID();
	const queryClient = useQueryClient();
	const { rule, schedule } = props;
	const [draft, setDraft] = useState<Draft>(() => ({
		enabled: rule.enabled,
		postToChannel: rule.postToChannel,
		previewRequired: rule.previewRequired,
		sortMode: rule.sortMode,
		reportLanguage: languages.includes(rule.reportLanguage) ? rule.reportLanguage : 'english',
		includeOnLeave: rule.includeOnLeave,
		includeMissing: rule.includeMissing,
		includeTime: rule.includeTime,
		includeBlockers: rule.includeBlockers,
	}));
	const patch = (changes: Partial<Draft>): void => setDraft(current => ({ ...current, ...changes }));

	const kindLabel = t(`settings.reportRules.kind.${rule.reportKind}`);
	const save = useMutation({
		mutationFn: () => updateReportRule(workspaceID, rule.id, draft),
		onSuccess: () => {
			toast.success(t('settings.reportRules.toast.updated'));

			return queryClient.invalidateQueries({ queryKey: workspaceKey(workspaceID, 'settings', 'report-rules') });
		},
	});

	return (
		<Section
			divided
			title={
				schedule.known
					? t('settings.reportRules.rule.title', { templateName: schedule.templateName, reportKind: kindLabel })
					: t('settings.reportRules.rule.unlinked.title', { reportKind: kindLabel })
			}
			description={
				schedule.known
					? t('settings.reportRules.rule.description', { reportKind: kindLabel, openTime: schedule.opensAt, closeTime: schedule.closesAt })
					: t('settings.reportRules.rule.unlinked.description')
			}
			actions={
				<StatusText kind={draft.enabled ? 'approved' : 'inactive'}>
					{draft.postToChannel
						? t('settings.reportRules.field.postToChannel.label')
						: t('settings.reportRules.field.previewRequired.label')}
				</StatusText>
			}
		>
			<Stack gap={0}>
				<Switch
					checked={draft.enabled}
					onChange={enabled => patch({ enabled })}
					label={t('settings.reportRules.field.enabled.label')}
					description={t('settings.reportRules.field.enabled.description')}
				/>
				<Switch
					checked={draft.postToChannel}
					onChange={postToChannel => patch({ postToChannel })}
					label={t('settings.reportRules.field.postToChannel.label')}
					description={t('settings.reportRules.field.postToChannel.description')}
				/>
				<Switch
					checked={draft.previewRequired}
					onChange={previewRequired => patch({ previewRequired })}
					label={t('settings.reportRules.field.previewRequired.label')}
					description={t('settings.reportRules.field.previewRequired.description')}
				/>
				{INCLUDES.map(item => (
					<Switch
						key={item.field}
						checked={draft[item.field]}
						onChange={checked => patch({ [item.field]: checked })}
						label={t(item.label)}
						description={t(item.description)}
					/>
				))}
			</Stack>
			<Grid columns={2}>
				<Select
					label={t('settings.reportRules.field.sortMode.label')}
					value={draft.sortMode}
					onChange={value => patch({ sortMode: value as ReportSortMode })}
					options={reportSortOptions(t, true)}
				/>
				<Select
					label={t('settings.reportRules.field.language.label')}
					value={draft.reportLanguage}
					onChange={value => patch({ reportLanguage: value as ReportLanguage })}
					options={languages.map(language => ({ value: language, label: languageNativeName(language) }))}
				/>
			</Grid>
			<div>
				<Button loading={save.isPending} onClick={() => save.mutate()}>
					{t('settings.reportRules.action.save')}
				</Button>
			</div>
		</Section>
	);
}
