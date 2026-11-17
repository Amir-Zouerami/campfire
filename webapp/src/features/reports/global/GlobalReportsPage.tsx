import { useMutation, useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';

import {
	exportGlobalLeaveReportCSV,
	exportGlobalTimeReportCSV,
	getGlobalLeaveReportSummary,
	getGlobalTimeReportSummary,
} from '@/shared/api';
import { leaveDurationText, leaveRangeText, leaveStatusKey, leaveStatusKind, leaveTypeName } from '@/shared/data/leave';
import { useI18n } from '@/shared/i18n';
import type { TranslationKey } from '@/shared/i18n';
import { addDays, isIsoDate } from '@/shared/lib/date';
import { downloadBlob } from '@/shared/lib/download';
import { useToday } from '@/shared/session';
import { UserName } from '@/shared/users';
import {
	Button,
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
	StatusText,
	Tag,
	Text,
	toast,
} from '@/shared/ui';
import type { TimeReportGroupBy } from '@/shared/types/domain';

type Mode = 'time' | 'leave';

const GROUPINGS: readonly { readonly value: TimeReportGroupBy; readonly label: TranslationKey }[] = [
	{ value: 'person', label: 'reports.global.group.person' },
	{ value: 'project', label: 'reports.global.group.project' },
	{ value: 'category', label: 'reports.global.group.category' },
	{ value: 'task', label: 'reports.global.group.task' },
	{ value: 'day', label: 'reports.global.group.day' },
	{ value: 'week', label: 'reports.global.group.week' },
];

/**
 * GlobalReportsPage totals time and leave across every active workspace. It is for
 * system admins and people granted global report access.
 */
export function GlobalReportsPage(): ReactElement {
	const { t } = useI18n();
	const today = useToday();
	const [mode, setMode] = useState<Mode>('time');
	const [start, setStart] = useState(() => addDays(today, -14));
	const [end, setEnd] = useState(today);
	const [groupBy, setGroupBy] = useState<TimeReportGroupBy>('person');

	const valid = isIsoDate(start) && isIsoDate(end) && end >= start;

	const exportCSV = useMutation({
		mutationFn: async () => {
			const blob = mode === 'time' ? await exportGlobalTimeReportCSV(start, end, groupBy) : await exportGlobalLeaveReportCSV(start, end);
			downloadBlob(blob, `campfire-global-${mode}-${start}-to-${end}.csv`);
		},
		onSuccess: () => toast.success(t(mode === 'time' ? 'reports.global.time.csv.downloaded' : 'reports.global.leave.csv.downloaded')),
	});

	return (
		<Container>
			<PageHeader
				eyebrow={t('workspace.nav.reports.label')}
				title={t(mode === 'time' ? 'reports.global.time.title' : 'reports.global.leave.title')}
				description={t(mode === 'time' ? 'reports.global.time.description' : 'reports.global.leave.description')}
				actions={
					<Button variant="secondary" icon={Download} disabled={!valid} loading={exportCSV.isPending} onClick={() => exportCSV.mutate()}>
						{t('reports.global.actions.csv')}
					</Button>
				}
			/>

			<Grid columns={4} align="end">
				<Field label={t('reports.global.tabs.ariaLabel')}>
					<Select
						value={mode}
						onChange={value => setMode(value as Mode)}
						options={[
							{ value: 'time', label: t('reports.global.tabs.time.label') },
							{ value: 'leave', label: t('reports.global.tabs.leave.label') },
						]}
					/>
				</Field>
				<Field label={t('reports.global.controls.startDate')}>
					<DateField value={start} onChange={setStart} />
				</Field>
				<Field label={t('reports.global.controls.endDate')}>
					<DateField value={end} onChange={setEnd} />
				</Field>
				{mode === 'time' && (
					<Field label={t('reports.global.controls.groupBy')}>
						<Select
							value={groupBy}
							onChange={value => setGroupBy(value as TimeReportGroupBy)}
							options={GROUPINGS.map(group => ({ value: group.value, label: t(group.label) }))}
						/>
					</Field>
				)}
			</Grid>

			{!valid ? (
				<Notice tone="warning">
					{start === ''
						? t('reports.global.validation.startRequired')
						: end === ''
							? t('reports.global.validation.endRequired')
							: t('reports.global.validation.rangeOrder')}
				</Notice>
			) : mode === 'time' ? (
				<GlobalTime start={start} end={end} groupBy={groupBy} />
			) : (
				<GlobalLeave start={start} end={end} />
			)}
		</Container>
	);
}

type RangeProps = { readonly start: string; readonly end: string };

/**
 * GlobalTime shows time per workspace and a grouped breakdown.
 */
function GlobalTime(props: RangeProps & { readonly groupBy: TimeReportGroupBy }): ReactElement {
	const { t, formatDuration } = useI18n();
	const report = useQuery({
		queryKey: ['global-reports', 'time', props.start, props.end, props.groupBy],
		queryFn: async () => (await getGlobalTimeReportSummary(props.start, props.end, props.groupBy)).summary,
		staleTime: 30_000,
	});

	if (report.isPending) {
		return <LoadingState title={t('reports.global.loading')} />;
	}

	return (
		<QueryView query={report} errorTitle={t('reports.global.error.fallback')}>
			{summary => (
				<>
					<Inline gap={10} wrap>
						<Stat label={t('reports.global.summary.totalTime')} value={formatDuration(summary.totalMinutes)} emphasis />
						<Stat label={t('reports.global.summary.entries')} value={summary.entryCount} />
						<Stat label={t('reports.global.summary.workspaces')} value={summary.workspaceCount} />
					</Inline>
					<Section divided eyebrow={t('reports.global.time.workspace.eyebrow')} title={t('reports.global.time.workspace.title')}>
						{summary.workspaces.length === 0 ? (
							<Text tone="muted">{t('reports.global.time.workspace.empty.description')}</Text>
						) : (
							<HorizontalBars
								label={t('reports.global.time.workspace.title')}
								rows={summary.workspaces.map(workspace => ({
									key: workspace.workspaceId,
									label: (
										<Text weight="semibold" userContent truncate>
											{workspace.workspaceName}
										</Text>
									),
									value: workspace.totalMinutes,
									valueLabel: formatDuration(workspace.totalMinutes),
								}))}
							/>
						)}
					</Section>
					<Section divided eyebrow={t('reports.global.time.rows.eyebrow')} title={t('reports.global.time.rows.title')}>
						{summary.rows.length === 0 ? (
							<Text tone="muted">{t('reports.global.time.rows.empty.description')}</Text>
						) : (
							<ListRows label={t('reports.global.time.rows.title')}>
								{summary.rows.map(row => (
									<ListRow
										key={row.key}
										title={
											row.userId !== '' ? (
												<UserName userID={row.userId} />
											) : (
												<span dir="auto">{row.label.trim() === '' ? t('reports.global.row.unlabeled') : row.label}</span>
											)
										}
										subtitle={`${t('reports.global.time.row.periodRange', { start: row.periodStart, end: row.periodEnd })} · ${row.entryCount === 1 ? `1 ${t('reports.global.entry.singular')}` : t('reports.global.entry.plural', { count: row.entryCount })}`}
										trailing={
											<Text weight="bold" numeric>
												{formatDuration(row.minutes)}
											</Text>
										}
									/>
								))}
							</ListRows>
						)}
					</Section>
				</>
			)}
		</QueryView>
	);
}

/**
 * GlobalLeave shows leave counts per workspace and type, and every request in range.
 */
function GlobalLeave(props: RangeProps): ReactElement {
	const { t } = useI18n();
	const report = useQuery({
		queryKey: ['global-reports', 'leave', props.start, props.end],
		queryFn: async () => (await getGlobalLeaveReportSummary(props.start, props.end)).summary,
		staleTime: 30_000,
	});

	if (report.isPending) {
		return <LoadingState title={t('reports.global.loading')} />;
	}

	return (
		<QueryView query={report} errorTitle={t('reports.global.error.fallback')}>
			{summary => (
				<>
					<Inline gap={10} wrap>
						<Stat label={t('reports.global.summary.approved')} value={summary.approvedCount} emphasis />
						<Stat label={t('reports.global.summary.pending')} value={summary.pendingCount} />
						<Stat label={t('reports.global.summary.workspaces')} value={summary.workspaceCount} />
					</Inline>
					<Grid columns={2}>
						<Section
							divided
							eyebrow={t('reports.global.leave.breakdown.workspaces.eyebrow')}
							title={t('reports.global.leave.breakdown.workspaces.title')}
						>
							{summary.workspaces.length === 0 ? (
								<Text tone="muted">{t('reports.global.leave.breakdown.workspaces.empty')}</Text>
							) : (
								<ListRows label={t('reports.global.leave.breakdown.workspaces.title')}>
									{summary.workspaces.map(workspace => (
										<ListRow
											key={workspace.workspaceId}
											title={<span dir="auto">{workspace.workspaceName}</span>}
											subtitle={`${t('reports.global.leave.count.approved', { count: workspace.approvedCount })} · ${t('reports.global.leave.count.pending', { count: workspace.pendingCount })}`}
										/>
									))}
								</ListRows>
							)}
						</Section>
						<Section
							divided
							eyebrow={t('reports.global.leave.breakdown.types.eyebrow')}
							title={t('reports.global.leave.breakdown.types.title')}
						>
							{summary.types.length === 0 ? (
								<Text tone="muted">{t('reports.global.leave.breakdown.types.empty')}</Text>
							) : (
								<ListRows label={t('reports.global.leave.breakdown.types.title')}>
									{summary.types.map(type => (
										<ListRow
											key={type.leaveTypeName}
											title={<span dir="auto">{leaveTypeName(t, { name: type.leaveTypeName })}</span>}
											subtitle={`${t('reports.global.leave.count.approved', { count: type.approvedCount })} · ${t('reports.global.leave.count.pending', { count: type.pendingCount })}`}
										/>
									))}
								</ListRows>
							)}
						</Section>
					</Grid>
					<Section divided eyebrow={t('reports.global.leave.rows.eyebrow')} title={t('reports.global.leave.rows.title')}>
						{summary.rows.length === 0 ? (
							<Text tone="muted">{t('reports.global.leave.rows.empty.description')}</Text>
						) : (
							<ListRows label={t('reports.global.leave.rows.title')}>
								{summary.rows.map(row => {
									const leave = row.leaveRequest.leaveRequest;
									const typeLabel = leaveTypeName(t, { name: row.leaveRequest.leaveTypeName });

									return (
										<ListRow
											key={leave.id}
											title={<UserName userID={leave.userId} />}
											subtitle={t('reports.global.leave.row.subtitle', { workspace: row.workspaceName, type: typeLabel })}
											detail={<Text size="sm" tone="muted">{`${leaveRangeText(leave)} · ${leaveDurationText(t, leave)}`}</Text>}
											trailing={
												<>
													<Tag>{typeLabel}</Tag>
													<StatusText kind={leaveStatusKind(leave.status)}>{t(leaveStatusKey(leave.status))}</StatusText>
												</>
											}
										/>
									);
								})}
							</ListRows>
						)}
					</Section>
				</>
			)}
		</QueryView>
	);
}
