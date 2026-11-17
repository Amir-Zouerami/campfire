import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { getDailyReportPreview, postDailyReportPreview } from '@/shared/api';
import { reportSortOptions } from '@/shared/data/reports';
import { useI18n } from '@/shared/i18n';
import { isolateBidi } from '@/shared/i18n';
import { calendarLabelsFor, isIsoDate } from '@/shared/lib/date';
import { useNavigation } from '@/shared/navigation';
import { workspaceKey } from '@/shared/query/keys';
import { useToday, useWorkspaceSession } from '@/shared/session';
import { Container, DateField, Field, Grid, Inline, Notice, PageHeader, Select, Stat, toast } from '@/shared/ui';
import type { StandupSubmissionSortMode } from '@/shared/types/domain';

import { filterDailySort, filterDate, parseFilter } from '../common/appliedFilter';
import { reportErrorMessage } from '../common/reportErrors';
import { ReportViewer } from '../common/ReportViewer';

/**
 * DailyReportPage previews the daily standup report and posts it to the workspace channel.
 * A saved filter applied from the Saved filters page pre-fills the date and sort order.
 */
export function DailyReportPage(): ReactElement {
	const { t } = useI18n();
	const navigation = useNavigation();
	const { workspace } = useWorkspaceSession();
	const today = useToday();
	const queryClient = useQueryClient();

	const applied = navigation.params?.filter?.reportType === 'daily' ? navigation.params.filter : undefined;
	const appliedRecord = applied === undefined ? null : parseFilter(applied);
	const [date, setDate] = useState(() => (appliedRecord === null ? today : (filterDate(appliedRecord, 'occurrenceDate') ?? today)));
	const [sortMode, setSortMode] = useState<StandupSubmissionSortMode>(() =>
		appliedRecord === null ? 'first_submitted' : filterDailySort(appliedRecord),
	);

	const validDate = isIsoDate(date);
	const labels = calendarLabelsFor([date], workspace.timezone);

	const preview = useQuery({
		queryKey: workspaceKey(workspace.id, 'reports', 'daily', date, sortMode, workspace.timezone),
		queryFn: async () => (await getDailyReportPreview(workspace.id, date, sortMode, labels)).preview,
		enabled: validDate,
		staleTime: 15_000,
	});

	const post = useMutation({
		mutationFn: () => postDailyReportPreview(workspace.id, { occurrenceDate: date, sortMode, calendarLabels: labels }),
		onSuccess: () => {
			toast.success(t('reports.preview.toast.dailyPosted'));

			return queryClient.invalidateQueries({ queryKey: workspaceKey(workspace.id, 'reports') });
		},
	});

	return (
		<Container>
			<PageHeader
				eyebrow={t('workspace.nav.reports.label')}
				title={t('reports.sections.daily.label')}
				description={t('reports.sections.daily.description')}
			/>

			{applied !== undefined && appliedRecord !== null && (
				<Notice tone="success">{t('reports.preview.filter.applied', { name: isolateBidi(applied.name) })}</Notice>
			)}
			{applied !== undefined && appliedRecord === null && (
				<Notice tone="warning">{t('reports.preview.filter.invalidJson', { name: isolateBidi(applied.name) })}</Notice>
			)}

			<Grid columns={2}>
				<Field label={t('reports.preview.field.reportDate')}>
					<DateField value={date} onChange={setDate} />
				</Field>
				<Field label={t('reports.preview.field.sortMode')}>
					<Select
						value={sortMode}
						onChange={value => setSortMode(value as StandupSubmissionSortMode)}
						options={reportSortOptions(t, false)}
					/>
				</Field>
			</Grid>

			{!validDate && <Notice tone="warning">{t('reports.preview.validation.dailyDate')}</Notice>}
			{preview.isError && <Notice tone="danger">{reportErrorMessage(preview.error, t)}</Notice>}

			{preview.data !== undefined && (
				<Inline gap={10} wrap>
					<Stat label={t('reports.preview.summary.submitted')} value={preview.data.submittedUserIds.length} />
					<Stat
						label={t('reports.preview.summary.missing')}
						value={preview.data.missingUserIds.length}
						emphasis={preview.data.missingUserIds.length > 0}
					/>
					<Stat label={t('reports.preview.summary.onLeave')} value={preview.data.onLeaveUserIds.length} />
					<Stat label={t('reports.preview.summary.markdownLines')} value={preview.data.markdown.split('\n').length} />
				</Inline>
			)}

			<ReportViewer
				markdown={preview.data?.markdown}
				loading={validDate && preview.isPending}
				posting={post.isPending}
				canPost={validDate && preview.data !== undefined}
				onPost={() => post.mutate()}
			/>
		</Container>
	);
}
