import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { getWeeklyReportPreview, postWeeklyReportPreview } from '@/shared/api';
import { reportSortOptions } from '@/shared/data/reports';
import { useI18n } from '@/shared/i18n';
import { isolateBidi } from '@/shared/i18n';
import { calendarLabelsFor, eachDate, isIsoDate, weekRangeOf } from '@/shared/lib/date';
import { useNavigation } from '@/shared/navigation';
import { workspaceKey } from '@/shared/query/keys';
import { useToday, useWeekStart, useWorkspaceSession } from '@/shared/session';
import { Button, Container, DateField, Field, Grid, Inline, Notice, PageHeader, Select, Stat, toast } from '@/shared/ui';
import type { ReportSortMode } from '@/shared/types/domain';

import { filterDate, filterWeeklySort, parseFilter } from '../common/appliedFilter';
import { reportErrorMessage } from '../common/reportErrors';
import { ReportViewer } from '../common/ReportViewer';

/**
 * WeeklyReportPage previews the weekly report for a date range and posts it to the workspace channel.
 */
export function WeeklyReportPage(): ReactElement {
	const { t } = useI18n();
	const navigation = useNavigation();
	const { workspace } = useWorkspaceSession();
	const today = useToday();
	const thisWeek = weekRangeOf(today, useWeekStart());
	const queryClient = useQueryClient();

	const applied = navigation.params?.filter?.reportType === 'weekly' ? navigation.params.filter : undefined;
	const appliedRecord = applied === undefined ? null : parseFilter(applied);
	const [start, setStart] = useState(() =>
		appliedRecord === null ? thisWeek.startDate : (filterDate(appliedRecord, 'periodStart') ?? thisWeek.startDate),
	);
	const [end, setEnd] = useState(() =>
		appliedRecord === null ? thisWeek.endDate : (filterDate(appliedRecord, 'periodEnd') ?? thisWeek.endDate),
	);
	const [sortMode, setSortMode] = useState<ReportSortMode>(() =>
		appliedRecord === null ? 'first_submitted' : filterWeeklySort(appliedRecord),
	);

	const validRange = isIsoDate(start) && isIsoDate(end) && start <= end;
	const labels = calendarLabelsFor(validRange ? eachDate(start, end) : [], workspace.timezone);

	const preview = useQuery({
		queryKey: workspaceKey(workspace.id, 'reports', 'weekly', start, end, sortMode, workspace.timezone),
		queryFn: async () => (await getWeeklyReportPreview(workspace.id, start, end, sortMode, labels)).preview,
		enabled: validRange,
		staleTime: 15_000,
	});

	const post = useMutation({
		mutationFn: () => postWeeklyReportPreview(workspace.id, { periodStart: start, periodEnd: end, sortMode, calendarLabels: labels }),
		onSuccess: () => {
			toast.success(t('reports.preview.toast.weeklyPosted'));

			return queryClient.invalidateQueries({ queryKey: workspaceKey(workspace.id, 'reports') });
		},
	});

	return (
		<Container>
			<PageHeader
				eyebrow={t('workspace.nav.reports.label')}
				title={t('reports.sections.weekly.label')}
				description={t('reports.sections.weekly.description')}
			/>

			{applied !== undefined && appliedRecord !== null && (
				<Notice tone="success">{t('reports.preview.filter.applied', { name: isolateBidi(applied.name) })}</Notice>
			)}
			{applied !== undefined && appliedRecord === null && (
				<Notice tone="warning">{t('reports.preview.filter.invalidJson', { name: isolateBidi(applied.name) })}</Notice>
			)}

			<Grid columns={3} align="end">
				<Field label={t('reports.preview.field.periodStart')}>
					<DateField value={start} onChange={setStart} />
				</Field>
				<Field label={t('reports.preview.field.periodEnd')}>
					<DateField value={end} onChange={setEnd} />
				</Field>
				<Field label={t('reports.preview.field.sortMode')}>
					<Select value={sortMode} onChange={value => setSortMode(value as ReportSortMode)} options={reportSortOptions(t, true)} />
				</Field>
			</Grid>
			<Inline>
				<Button
					variant="secondary"
					size="sm"
					onClick={() => {
						setStart(thisWeek.startDate);
						setEnd(thisWeek.endDate);
					}}
				>
					{t('reports.preview.action.thisWeek')}
				</Button>
			</Inline>

			{!validRange && <Notice tone="warning">{t('reports.preview.validation.weeklyRange')}</Notice>}
			{preview.isError && <Notice tone="danger">{reportErrorMessage(preview.error, t)}</Notice>}

			{preview.data !== undefined && (
				<Inline gap={10} wrap>
					<Stat label={t('reports.preview.summary.submitted')} value={preview.data.submittedCount} />
					<Stat label={t('reports.preview.summary.missing')} value={preview.data.missingCount} emphasis={preview.data.missingCount > 0} />
					<Stat label={t('reports.preview.summary.onLeave')} value={preview.data.onLeaveCount} />
					<Stat label={t('reports.preview.summary.days')} value={preview.data.dailyPreviews.length} />
					<Stat label={t('reports.preview.summary.markdownLines')} value={preview.data.markdown.split('\n').length} />
				</Inline>
			)}

			<ReportViewer
				markdown={preview.data?.markdown}
				loading={validRange && preview.isPending}
				posting={post.isPending}
				canPost={validRange && preview.data !== undefined}
				onPost={() => post.mutate()}
			/>
		</Container>
	);
}
