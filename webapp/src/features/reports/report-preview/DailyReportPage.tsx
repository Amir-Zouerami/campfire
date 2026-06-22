import type { ReactElement } from 'react';

import { CampfireControlsPanel } from '@/components/campfire/CampfireControlsPanel';
import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireReportSummaryBar } from '@/components/campfire/CampfireReportSummaryBar';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { useI18n } from '@/i18n';
import type { Workspace } from '@/types/domain';

import { dailyReportSortOptions, toDailyReportSortMode } from './report-preview.helpers';
import { translateReportSortMode } from './report-preview.i18n';
import { ReportMarkdownPreview } from './ReportMarkdownPreview';
import { ReportPreviewFeedback, ReportPreviewLoading } from './ReportPreviewFeedback';
import { useDailyReportPreview } from './useDailyReportPreview';

/**
 * DailyReportPageProps contains workspace context and refresh behavior.
 */
type DailyReportPageProps = {
	readonly workspace: Workspace;
	readonly refreshToken: number;
};

/**
 * DailyReportPage renders the focused daily report preview/post workflow.
 */
export function DailyReportPage(props: DailyReportPageProps): ReactElement {
	const { t } = useI18n();
	const report = useDailyReportPreview(props);

	return (
		<div className="campfire-page-stack campfire-report-page-stack">

			<CampfireControlsPanel
				eyebrow={t('reports.preview.controls.eyebrow')}
				title={t('reports.preview.daily.title')}
				description={t('reports.preview.daily.description')}
				controls={(
					<div className="campfire-control-grid campfire-control-grid--daily-report">
						<CampfireField id="campfire-daily-report-date" label={t('reports.preview.field.reportDate')}>
							<CampfireDateInput
								id="campfire-daily-report-date"
								disabled={report.isBusy}
								timezone={props.workspace.timezone}
								workingDays={props.workspace.workingDays}
								value={report.occurrenceDate}
								onValueChange={report.setOccurrenceDate}
							/>
						</CampfireField>

						<CampfireField id="campfire-daily-report-sort" label={t('reports.preview.field.sortMode')}>
							<CampfireSelect
								id="campfire-daily-report-sort"
								disabled={report.isBusy}
								value={report.sortMode}
								onValueChange={value => report.setSortMode(toDailyReportSortMode(value))}
							>
								{dailyReportSortOptions.map(sortMode => (
									<option key={sortMode} value={sortMode}>
										{translateReportSortMode(t, sortMode)}
									</option>
								))}
							</CampfireSelect>
						</CampfireField>
					</div>
				)}
			>
				<ReportPreviewFeedback state={report.loadState} message={report.message} />
			</CampfireControlsPanel>

			{report.loadState === 'loading' && <ReportPreviewLoading />}

			{report.preview !== null && (
				<CampfireReportSummaryBar
					ariaLabel={t('reports.preview.summary.ariaLabel')}
					items={[
						{ label: t('reports.preview.summary.submitted'), value: String(report.submittedCount), tone: 'success' },
						{ label: t('reports.preview.summary.missing'), value: String(report.missingCount), tone: report.missingCount > 0 ? 'danger' : 'neutral' },
						{ label: t('reports.preview.summary.onLeave'), value: String(report.onLeaveCount), tone: 'neutral' },
						{ label: t('reports.preview.summary.markdownLines'), value: String(report.markdownLines), tone: 'neutral' },
					]}
				/>
			)}

			<ReportMarkdownPreview
				markdown={report.preview?.markdown ?? ''}
				disabled={report.isBusy || report.preview === null}
				onPost={report.postReport}
			/>
		</div>
	);
}
