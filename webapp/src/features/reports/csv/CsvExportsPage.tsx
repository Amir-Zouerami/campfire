import { useMutation } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { reportSortOptions } from '@/shared/data/reports';
import { useI18n } from '@/shared/i18n';
import { isolateBidi } from '@/shared/i18n';
import { addDays, isIsoDate } from '@/shared/lib/date';
import { downloadBlob } from '@/shared/lib/download';
import { useNavigation } from '@/shared/navigation';
import { useToday, useWorkspaceID } from '@/shared/session';
import { Button, Container, DateField, Field, Grid, ListRow, ListRows, Notice, PageHeader, Section, Select, Tag, toast } from '@/shared/ui';
import type { StandupSubmissionSortMode } from '@/shared/types/domain';

import { filterDailySort, filterDate, parseFilter } from '../common/appliedFilter';
import { CSV_EXPORTS, csvFilename } from './csvExports';
import type { CsvExport } from './csvExports';

/**
 * CsvExportsPage downloads workspace data as CSV for a date range.
 * Saved "missing" and "blockers" filters open here and pre-fill the range and sort order.
 */
export function CsvExportsPage(): ReactElement {
	const { t } = useI18n();
	const navigation = useNavigation();
	const workspaceID = useWorkspaceID();
	const today = useToday();

	const applied = navigation.params?.filter;
	const appliedRecord = applied === undefined ? null : parseFilter(applied);
	const [start, setStart] = useState(() =>
		appliedRecord === null ? addDays(today, -14) : (filterDate(appliedRecord, 'startDate') ?? addDays(today, -14)),
	);
	const [end, setEnd] = useState(() => (appliedRecord === null ? today : (filterDate(appliedRecord, 'endDate') ?? today)));
	const [sortMode, setSortMode] = useState<StandupSubmissionSortMode>(() =>
		appliedRecord === null ? 'first_submitted' : filterDailySort(appliedRecord),
	);

	const valid = isIsoDate(start) && isIsoDate(end) && end >= start;

	const exportCSV = useMutation({
		mutationFn: async (action: CsvExport) => {
			const blob = await action.fetch(workspaceID, start, end, sortMode);
			downloadBlob(blob, csvFilename(action.filenamePrefix, start, end));

			return action;
		},
		onSuccess: action => toast.success(t('reports.csv.toast.exported', { title: t(action.title) })),
	});

	return (
		<Container>
			<PageHeader
				eyebrow={t('workspace.nav.reports.label')}
				title={t('reports.sections.exports.label')}
				description={t('reports.sections.exports.description')}
			/>

			{applied !== undefined && appliedRecord !== null && (
				<Notice tone="success">{t('reports.csv.filter.applied', { name: isolateBidi(applied.name) })}</Notice>
			)}
			{applied !== undefined && appliedRecord === null && (
				<Notice tone="warning">{t('reports.csv.filter.invalid', { name: isolateBidi(applied.name) })}</Notice>
			)}

			<Section title={t('reports.csv.controls.title')} description={t('reports.csv.controls.description')}>
				<Grid columns={3}>
					<Field label={t('reports.csv.field.startDate')}>
						<DateField value={start} onChange={setStart} />
					</Field>
					<Field label={t('reports.csv.field.endDate')}>
						<DateField value={end} onChange={setEnd} />
					</Field>
					<Field label={t('reports.csv.field.sortMode')}>
						<Select
							value={sortMode}
							onChange={value => setSortMode(value as StandupSubmissionSortMode)}
							options={reportSortOptions(t, false)}
						/>
					</Field>
				</Grid>
				{!valid && (
					<Notice tone="warning">
						{start === ''
							? t('reports.csv.validation.startDateRequired')
							: end === ''
								? t('reports.csv.validation.endDateRequired')
								: t('reports.csv.validation.endBeforeStart')}
					</Notice>
				)}
			</Section>

			<Section divided title={t('reports.csv.summary.availableExports')}>
				<ListRows label={t('reports.csv.summary.availableExports')}>
					{CSV_EXPORTS.map(action => (
						<ListRow
							key={action.kind}
							title={t(action.title)}
							subtitle={t(action.description)}
							trailing={
								<>
									<Tag>{action.usesSort ? t('reports.csv.action.badge.usesSort') : t('reports.csv.action.badge.dateRange')}</Tag>
									<Button
										variant="secondary"
										size="sm"
										icon={Download}
										disabled={!valid}
										loading={exportCSV.isPending && exportCSV.variables?.kind === action.kind}
										onClick={() => exportCSV.mutate(action)}
									>
										{t('reports.csv.action.export')}
									</Button>
								</>
							}
						/>
					))}
				</ListRows>
			</Section>
		</Container>
	);
}
