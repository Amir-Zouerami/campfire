import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { getDataRetentionPreview, purgeWorkspaceData } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import type { TranslationKey } from '@/shared/i18n';
import { addDays } from '@/shared/lib/date';
import { workspaceKey } from '@/shared/query/keys';
import { useRefreshBootstrap } from '@/shared/query/useRefreshBootstrap';
import { useToday, useWorkspaceID } from '@/shared/session';
import type { DataRetentionSummary } from '@/shared/types/api';
import {
	Button,
	ConfirmDialog,
	Container,
	DateField,
	Field,
	Grid,
	ListRow,
	ListRows,
	Notice,
	PageHeader,
	QueryView,
	Section,
	Stack,
	Text,
	toast,
} from '@/shared/ui';

/**
 * METRICS are the kinds of history a purge removes, in display order.
 */
const METRICS = [
	'standupSubmissions',
	'standupAnswers',
	'leaveRequests',
	'leaveDecisions',
	'timeEntries',
	'reportRuns',
	'notificationRuns',
	'auditLogEntries',
] as const satisfies readonly (keyof DataRetentionSummary)[];

const metricKey = (metric: (typeof METRICS)[number], part: 'label' | 'description'): TranslationKey =>
	`settings.dataManagement.metric.${metric}.${part}`;

/**
 * DataManagementPage previews and hard-deletes old operational history. A purge always
 * deletes exactly what the last preview counted, never a different date.
 */
export function DataManagementPage(): ReactElement {
	const { t, formatNumber } = useI18n();
	const workspaceID = useWorkspaceID();
	const today = useToday();
	const queryClient = useQueryClient();
	const refreshBootstrap = useRefreshBootstrap();
	const [cutoff, setCutoff] = useState(() => addDays(today, -90));
	const [previewed, setPreviewed] = useState('');
	const [confirming, setConfirming] = useState(false);

	const preview = useQuery({
		queryKey: workspaceKey(workspaceID, 'data-retention', previewed),
		queryFn: async () => (await getDataRetentionPreview(workspaceID, previewed)).summary,
		enabled: previewed !== '',
		staleTime: 0,
	});

	const purge = useMutation({
		mutationFn: () => purgeWorkspaceData(workspaceID, { cutoffDate: previewed }),
		onSuccess: async () => {
			toast.success(t('settings.dataManagement.toast.deleted'));
			setConfirming(false);
			await queryClient.invalidateQueries({ queryKey: workspaceKey(workspaceID) });
			refreshBootstrap();
		},
	});

	return (
		<Container>
			<PageHeader
				eyebrow={t('settings.dataManagement.page.eyebrow')}
				title={t('settings.dataManagement.page.title')}
				description={t('settings.dataManagement.page.description')}
			/>
			<Notice tone="warning" title={t('settings.dataManagement.guardrail.title')}>
				{t('settings.dataManagement.guardrail.description')}
			</Notice>

			<Section
				eyebrow={t('settings.dataManagement.preview.eyebrow')}
				title={t('settings.dataManagement.preview.title')}
				description={t('settings.dataManagement.preview.description')}
			>
				<Stack gap={4}>
					<Field label={t('settings.dataManagement.cutoff.label')} description={t('settings.dataManagement.cutoff.description')}>
						<DateField value={cutoff} onChange={setCutoff} disabled={purge.isPending} />
					</Field>
					<div>
						<Button
							loading={preview.isFetching}
							onClick={() => {
								if (cutoff.trim() === '') {
									toast.error(t('settings.dataManagement.error.cutoffRequired'));
									return;
								}

								if (cutoff === previewed) {
									void preview.refetch();
								}

								setPreviewed(cutoff);
							}}
						>
							{t('settings.dataManagement.preview.action')}
						</Button>
					</div>
				</Stack>
			</Section>

			{previewed !== '' && (
				<QueryView query={preview} loadingTitle={t('settings.dataManagement.preview.loading')}>
					{summary => (
						<Section
							divided
							eyebrow={t('settings.dataManagement.summary.eyebrow')}
							title={t('settings.dataManagement.summary.title', { count: formatNumber(summary.totalRows) })}
							description={t('settings.dataManagement.summary.description', { cutoffDate: summary.cutoffDate })}
							actions={
								<Button variant="danger" disabled={summary.totalRows === 0} onClick={() => setConfirming(true)}>
									{t('settings.dataManagement.summary.action')}
								</Button>
							}
						>
							<Grid columns={2}>
								<ListRows label={t('settings.dataManagement.summary.title', { count: formatNumber(summary.totalRows) })}>
									{METRICS.map(metric => (
										<ListRow
											key={metric}
											title={t(metricKey(metric, 'label'))}
											subtitle={t(metricKey(metric, 'description'))}
											trailing={
												<Text weight="bold" numeric>
													{formatNumber(summary[metric])}
												</Text>
											}
										/>
									))}
								</ListRows>
							</Grid>
							<ConfirmDialog
								open={confirming}
								tone="danger"
								title={t('settings.dataManagement.confirm.title')}
								description={`${t('settings.dataManagement.confirm.body', { count: formatNumber(summary.totalRows), cutoffDate: summary.cutoffDate })} ${t('settings.dataManagement.confirm.description')}`}
								confirmLabel={t('settings.dataManagement.confirm.action')}
								loading={purge.isPending}
								onCancel={() => setConfirming(false)}
								onConfirm={() => purge.mutate()}
							/>
						</Section>
					)}
				</QueryView>
			)}
		</Container>
	);
}
