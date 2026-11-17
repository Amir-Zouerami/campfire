import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { getTimeReportSummary } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import type { TranslationKey } from '@/shared/i18n';
import { isolateBidi } from '@/shared/i18n';
import { addDays, formatDate, isIsoDate } from '@/shared/lib/date';
import { useNavigation } from '@/shared/navigation';
import { workspaceKey } from '@/shared/query/keys';
import { useToday, useWorkspaceID } from '@/shared/session';
import { UserLabel } from '@/shared/users';
import {
	BarChart,
	Container,
	DateField,
	Field,
	Grid,
	HorizontalBars,
	Inline,
	ListRow,
	ListRows,
	LoadingState,
	Notice,
	PageHeader,
	QueryView,
	Section,
	Select,
	Stat,
	Text,
} from '@/shared/ui';
import type { TimeReportGroupBy, TimeReportRow, TimeReportSummary } from '@/shared/types/domain';

import { filterDate, filterGrouping, parseFilter } from '../common/appliedFilter';
import { niceTicks } from './chart';

const GROUPINGS: readonly { readonly value: TimeReportGroupBy; readonly label: TranslationKey }[] = [
	{ value: 'person', label: 'reports.time.group.person' },
	{ value: 'project', label: 'reports.time.group.project' },
	{ value: 'category', label: 'reports.time.group.category' },
	{ value: 'task', label: 'reports.time.group.task' },
	{ value: 'day', label: 'reports.time.group.day' },
	{ value: 'week', label: 'reports.time.group.week' },
];

/**
 * TimeReportPage totals logged time over a date range, grouped by person, project, task, day or week.
 */
export function TimeReportPage(): ReactElement {
	const { t } = useI18n();
	const navigation = useNavigation();
	const workspaceID = useWorkspaceID();
	const today = useToday();

	const applied = navigation.params?.filter?.reportType === 'time' ? navigation.params.filter : undefined;
	const appliedRecord = applied === undefined ? null : parseFilter(applied);
	const [start, setStart] = useState(() =>
		appliedRecord === null ? addDays(today, -14) : (filterDate(appliedRecord, 'startDate') ?? addDays(today, -14)),
	);
	const [end, setEnd] = useState(() => (appliedRecord === null ? today : (filterDate(appliedRecord, 'endDate') ?? today)));
	const [groupBy, setGroupBy] = useState<TimeReportGroupBy>(() => (appliedRecord === null ? 'person' : filterGrouping(appliedRecord)));

	const valid = isIsoDate(start) && isIsoDate(end) && end >= start;
	const report = useQuery({
		queryKey: workspaceKey(workspaceID, 'reports', 'time', start, end, groupBy),
		queryFn: async () => (await getTimeReportSummary(workspaceID, start, end, groupBy)).summary,
		enabled: valid,
		staleTime: 30_000,
	});

	return (
		<Container>
			<PageHeader
				eyebrow={t('workspace.nav.reports.label')}
				title={t('reports.sections.time.label')}
				description={t('reports.sections.time.description')}
			/>

			{applied !== undefined && appliedRecord !== null && (
				<Notice tone="success">{t('reports.time.filter.applied', { name: isolateBidi(applied.name) })}</Notice>
			)}
			{applied !== undefined && appliedRecord === null && (
				<Notice tone="warning">{t('reports.time.filter.invalid', { name: isolateBidi(applied.name) })}</Notice>
			)}

			<Grid columns={3} align="end">
				<Field label={t('reports.time.field.startDate')}>
					<DateField value={start} onChange={setStart} />
				</Field>
				<Field label={t('reports.time.field.endDate')}>
					<DateField value={end} onChange={setEnd} />
				</Field>
				<Field label={t('reports.time.field.groupBy')}>
					<Select
						value={groupBy}
						onChange={value => setGroupBy(value as TimeReportGroupBy)}
						options={GROUPINGS.map(group => ({ value: group.value, label: t(group.label) }))}
					/>
				</Field>
			</Grid>

			{!valid ? (
				<Notice tone="warning">
					{start === ''
						? t('reports.time.validation.startDateRequired')
						: end === ''
							? t('reports.time.validation.endDateRequired')
							: t('reports.time.validation.endBeforeStart')}
				</Notice>
			) : report.isPending ? (
				<LoadingState title={t('reports.time.loading')} />
			) : (
				<QueryView
					query={report}
					errorTitle={t('reports.time.error.fallback')}
					isEmpty={summary => summary.rows.length === 0}
					empty={{ title: t('reports.time.empty.title'), description: t('reports.time.empty.description') }}
				>
					{summary => <TimeReportBody summary={summary} groupBy={groupBy} today={today} />}
				</QueryView>
			)}
		</Container>
	);
}

type TimeReportBodyProps = {
	readonly summary: TimeReportSummary;
	readonly groupBy: TimeReportGroupBy;
	readonly today: string;
};

/**
 * TimeReportBody shows the totals, a chart suited to the grouping, and the detailed rows.
 */
function TimeReportBody(props: TimeReportBodyProps): ReactElement {
	const { t, formatDuration, formatDate: format, locale } = useI18n();
	const { summary } = props;
	const entries = summary.rows.reduce((total, row) => total + row.entryCount, 0);
	const byTime = props.groupBy === 'day' || props.groupBy === 'week';
	const sorted = byTime
		? [...summary.rows].sort((first, second) => first.periodStart.localeCompare(second.periodStart))
		: [...summary.rows].sort((first, second) => second.minutes - first.minutes);
	const scale = niceTicks(Math.max(...summary.rows.map(row => row.minutes), 0));

	return (
		<>
			<Inline gap={10} wrap>
				<Stat label={t('reports.time.summary.totalTime')} value={formatDuration(summary.totalMinutes)} emphasis />
				<Stat label={t('reports.time.summary.rows')} value={summary.rows.length} />
				<Stat label={t('reports.time.summary.entries')} value={entries} />
				<Stat
					label={t('reports.time.summary.groupedBy')}
					value={t(GROUPINGS.find(group => group.value === props.groupBy)?.label ?? 'reports.time.group.person')}
				/>
			</Inline>

			<Section divided eyebrow={t('reports.time.rows.eyebrow')} title={t('reports.time.rows.title')}>
				{byTime ? (
					<BarChart
						summary={sorted.map(row => `${row.periodStart}: ${formatDuration(row.minutes)}`).join('; ')}
						maxValue={scale.max}
						ticks={scale.ticks.map(value => ({ value, label: value === 0 ? '0' : `${value / 60}h` }))}
						bars={sorted.slice(-14).map(row => ({
							key: row.key,
							label: formatDate(row.periodStart, locale, { day: 'numeric', month: 'short' }),
							value: row.minutes,
							valueLabel: formatDuration(row.minutes),
							tone: row.periodStart <= props.today && row.periodEnd >= props.today ? 'highlight' : 'default',
						}))}
					/>
				) : (
					<HorizontalBars
						label={t('reports.time.rows.title')}
						rows={sorted.map(row => ({
							key: row.key,
							label: <RowLabel row={row} />,
							value: row.minutes,
							valueLabel: formatDuration(row.minutes),
						}))}
					/>
				)}
			</Section>

			<Section divided>
				<ListRows label={t('reports.time.rows.title')}>
					{sorted.map(row => (
						<ListRow
							key={row.key}
							title={<RowLabel row={row} />}
							subtitle={`${t('reports.time.row.periodRange', { start: format(row.periodStart), end: format(row.periodEnd) })} · ${row.entryCount === 1 ? t('reports.time.row.entrySingular') : t('reports.time.row.entryPlural', { count: row.entryCount })}`}
							trailing={
								<Text weight="bold" numeric>
									{formatDuration(row.minutes)}
								</Text>
							}
						/>
					))}
				</ListRows>
			</Section>
		</>
	);
}

/**
 * RowLabel names a report row: a person (with avatar) when grouped by person, else its label.
 */
function RowLabel(props: { readonly row: TimeReportRow }): ReactElement {
	const { t } = useI18n();

	if (props.row.userId !== '') {
		return <UserLabel userID={props.row.userId} size="xs" />;
	}

	return (
		<Text weight="semibold" userContent truncate>
			{props.row.label.trim() === '' ? t('reports.time.row.unlabeled') : props.row.label}
		</Text>
	);
}
