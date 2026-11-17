import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleHelp, Copy, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';
import * as z from 'zod/mini';

import { createSavedReportFilter, deleteSavedReportFilter, listSavedReportFilters } from '@/shared/api';
import { msg, submitForm, useAppForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import type { TranslationKey } from '@/shared/i18n';
import { isolateBidi } from '@/shared/i18n';
import { useNavigation } from '@/shared/navigation';
import type { PageId } from '@/shared/navigation';
import { workspaceKey } from '@/shared/query/keys';
import { useWorkspaceID } from '@/shared/session';
import {
	Button,
	CodeBlock,
	ConfirmDialog,
	Container,
	Field,
	IconButton,
	Inline,
	ListRow,
	ListRows,
	LoadingState,
	Modal,
	PageHeader,
	QueryView,
	Section,
	Select,
	Stack,
	Tag,
	Text,
	toast,
} from '@/shared/ui';
import type { ReportKind, SavedReportFilter } from '@/shared/types/domain';

const KINDS: readonly { readonly value: ReportKind; readonly label: TranslationKey }[] = [
	{ value: 'daily', label: 'reports.saved.reportKind.daily' },
	{ value: 'weekly', label: 'reports.saved.reportKind.weekly' },
	{ value: 'time', label: 'reports.saved.reportKind.time' },
	{ value: 'missing', label: 'reports.saved.reportKind.missing' },
	{ value: 'blockers', label: 'reports.saved.reportKind.blockers' },
];

/**
 * DESTINATIONS maps a saved filter's report type to the page that understands it.
 */
const DESTINATIONS: Readonly<Record<ReportKind, PageId>> = {
	daily: 'reports.daily',
	weekly: 'reports.weekly',
	time: 'reports.time',
	missing: 'reports.csv',
	blockers: 'reports.csv',
};

const EXAMPLES: readonly { readonly title: TranslationKey; readonly description: TranslationKey; readonly code: string }[] = [
	{
		title: 'reports.saved.help.daily.title',
		description: 'reports.saved.help.daily.description',
		code: '{\n  "occurrenceDate": "2026-06-04",\n  "sortMode": "first_submitted"\n}',
	},
	{
		title: 'reports.saved.help.weekly.title',
		description: 'reports.saved.help.weekly.description',
		code: '{\n  "periodStart": "2026-06-01",\n  "periodEnd": "2026-06-07",\n  "sortMode": "blockers_first"\n}',
	},
	{
		title: 'reports.saved.help.time.title',
		description: 'reports.saved.help.time.description',
		code: '{\n  "startDate": "2026-05-21",\n  "endDate": "2026-06-04",\n  "groupBy": "person"\n}',
	},
	{
		title: 'reports.saved.help.missing.title',
		description: 'reports.saved.help.missing.description',
		code: '{\n  "startDate": "2026-06-01",\n  "endDate": "2026-06-07",\n  "sortMode": "missing_first"\n}',
	},
	{
		title: 'reports.saved.help.blockers.title',
		description: 'reports.saved.help.blockers.description',
		code: '{\n  "startDate": "2026-06-01",\n  "endDate": "2026-06-07",\n  "sortMode": "blockers_first",\n  "includeBlockers": true\n}',
	},
];

const schema = z.object({
	name: z.string().check(z.trim(), z.minLength(1, msg('reports.saved.validation.nameRequired'))),
	reportType: z.enum(['daily', 'weekly', 'blockers', 'missing', 'time']),
	filterJson: z.string().check(
		z.refine(value => {
			try {
				JSON.parse(value.trim() === '' ? '{}' : value);

				return true;
			} catch {
				return false;
			}
		}, msg('reports.saved.validation.jsonInvalid')),
	),
});

/**
 * SavedFiltersPage keeps reusable report views, and opens one on the report it belongs to.
 */
export function SavedFiltersPage(): ReactElement {
	const { t, formatTimestamp } = useI18n();
	const workspaceID = useWorkspaceID();
	const navigation = useNavigation();
	const queryClient = useQueryClient();
	const [kind, setKind] = useState<ReportKind>('daily');
	const [helpOpen, setHelpOpen] = useState(false);
	const [deleting, setDeleting] = useState<SavedReportFilter | null>(null);

	const filters = useQuery({
		queryKey: workspaceKey(workspaceID, 'reports', 'saved-filters', kind),
		queryFn: async () => (await listSavedReportFilters(workspaceID, kind)).filters,
		staleTime: 30_000,
	});

	const refresh = (): Promise<void> => queryClient.invalidateQueries({ queryKey: workspaceKey(workspaceID, 'reports', 'saved-filters') });

	const create = useMutation({
		mutationFn: (value: z.infer<typeof schema>) =>
			createSavedReportFilter(workspaceID, {
				name: value.name.trim(),
				scope: 'workspace',
				reportType: value.reportType,
				filterJson: JSON.stringify(JSON.parse(value.filterJson.trim() === '' ? '{}' : value.filterJson)),
			}),
		onSuccess: () => {
			toast.success(t('reports.saved.toast.created'));

			return refresh();
		},
	});

	const remove = useMutation({
		mutationFn: (filterID: string) => deleteSavedReportFilter(workspaceID, filterID),
		onSuccess: () => {
			toast.success(t('reports.saved.toast.deleted'));

			return refresh();
		},
	});

	const form = useAppForm({
		defaultValues: { name: '', reportType: kind as ReportKind, filterJson: '{}' },
		validators: { onChange: schema, onSubmit: schema },
		onSubmit: async ({ value, formApi }) => {
			await create.mutateAsync(value);
			setKind(value.reportType);
			formApi.reset({ name: '', reportType: value.reportType, filterJson: '{}' });
		},
	});

	return (
		<Container>
			<PageHeader
				eyebrow={t('reports.saved.page.eyebrow')}
				title={t('reports.saved.page.title')}
				description={t('reports.saved.page.description')}
				actions={
					<Button variant="secondary" icon={CircleHelp} onClick={() => setHelpOpen(true)}>
						{t('reports.saved.help.action')}
					</Button>
				}
			/>

			<Section eyebrow={t('reports.saved.create.eyebrow')} title={t('reports.saved.create.title')}>
				<form
					noValidate
					onSubmit={event => {
						event.preventDefault();
						submitForm(form);
					}}
				>
					<Stack gap={4}>
						<form.AppField name="name">
							{field => (
								<field.TextField
									required
									userContent
									label={t('reports.saved.field.name')}
									placeholder={t('reports.saved.field.name.placeholder')}
								/>
							)}
						</form.AppField>
						<form.AppField name="reportType">
							{field => (
								<field.SelectField
									label={t('reports.saved.field.reportType')}
									options={KINDS.map(option => ({ value: option.value, label: t(option.label) }))}
								/>
							)}
						</form.AppField>
						<form.AppField name="filterJson">
							{field => (
								<field.TextAreaField
									rows={5}
									ltr
									label={t('reports.saved.field.filterJson')}
									description={t('reports.saved.field.filterJson.description')}
								/>
							)}
						</form.AppField>
						<div>
							<form.AppForm>
								<form.SubmitButton label={t('reports.saved.action.save')} />
							</form.AppForm>
						</div>
					</Stack>
				</form>
			</Section>

			<Section divided eyebrow={t('reports.saved.library.eyebrow')} title={t('reports.saved.library.title')}>
				<Field label={t('reports.saved.field.reportType')}>
					<Select
						value={kind}
						onChange={value => setKind(value as ReportKind)}
						options={KINDS.map(option => ({ value: option.value, label: t(option.label) }))}
					/>
				</Field>
				{filters.isPending ? (
					<LoadingState title={t('reports.saved.loading')} />
				) : (
					<QueryView
						query={filters}
						isEmpty={list => list.length === 0}
						empty={{ title: t('reports.saved.empty.title'), description: t('reports.saved.empty.description') }}
					>
						{list => (
							<ListRows label={t('reports.saved.library.title')}>
								{list.map(filter => (
									<ListRow
										key={filter.id}
										title={<span dir="auto">{filter.name}</span>}
										subtitle={t('reports.saved.row.updated', { updatedAt: formatTimestamp(filter.updatedAt) })}
										detail={
											<Text size="sm" tone="muted">
												<code dir="ltr">{filter.filterJson}</code>
											</Text>
										}
										trailing={
											<>
												<Tag>{t(KINDS.find(option => option.value === filter.reportType)?.label ?? 'reports.saved.reportKind.daily')}</Tag>
												<Button
													size="sm"
													variant="secondary"
													onClick={() => {
														toast.info(t('reports.saved.toast.applied', { name: isolateBidi(filter.name) }));
														navigation.navigate(DESTINATIONS[filter.reportType], { filter });
													}}
												>
													{t('reports.saved.action.apply')}
												</Button>
												<IconButton
													icon={Trash2}
													variant="ghost"
													label={t('reports.saved.action.delete')}
													onClick={() => setDeleting(filter)}
												/>
											</>
										}
									/>
								))}
							</ListRows>
						)}
					</QueryView>
				)}
			</Section>

			<Modal
				open={helpOpen}
				size="md"
				title={t('reports.saved.help.title')}
				description={t('reports.saved.help.description')}
				onClose={() => setHelpOpen(false)}
			>
				<Stack gap={5}>
					{EXAMPLES.map(example => (
						<Stack key={example.title} gap={2}>
							<Inline justify="between">
								<Text weight="bold">{t(example.title)}</Text>
								<IconButton
									icon={Copy}
									variant="ghost"
									size="sm"
									label={t('common.copy')}
									onClick={() => {
										void navigator.clipboard.writeText(example.code).then(() => toast.success(t('reports.preview.toast.copied')));
									}}
								/>
							</Inline>
							<Text size="sm" tone="muted">
								{t(example.description)}
							</Text>
							<CodeBlock>{example.code}</CodeBlock>
						</Stack>
					))}
				</Stack>
			</Modal>

			<ConfirmDialog
				open={deleting !== null}
				title={t('reports.saved.action.delete')}
				description={t('reports.saved.confirm.delete')}
				confirmLabel={t('reports.saved.action.delete')}
				tone="danger"
				loading={remove.isPending}
				onCancel={() => setDeleting(null)}
				onConfirm={() => {
					if (deleting !== null) {
						remove.mutate(deleting.id);
					}

					setDeleting(null);
				}}
			/>
		</Container>
	);
}
