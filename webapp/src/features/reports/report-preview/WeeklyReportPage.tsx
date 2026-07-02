import type { ReactElement } from 'react';
import { RotateCcw } from 'lucide-react';

import { CampfireControlButton } from '@/components/campfire/CampfireControlButton';
import { CampfireControlsPanel } from '@/components/campfire/CampfireControlsPanel';
import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireReportSummaryBar } from '@/components/campfire/CampfireReportSummaryBar';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { useI18n } from '@/i18n';
import type { Workspace } from '@/types/domain';

import { toWeeklyReportSortMode, weeklyReportSortOptions } from './report-preview.helpers';
import { translateReportSortMode } from './report-preview.i18n';
import { ReportMarkdownPreview } from './ReportMarkdownPreview';
import { ReportPreviewFeedback } from './ReportPreviewFeedback';
import { useWeeklyReportPreview } from './useWeeklyReportPreview';

/**
 * WeeklyReportPageProps contains workspace context and refresh behavior.
 */
type WeeklyReportPageProps = {
	readonly workspace: Workspace;
	readonly refreshToken: number;
};

/**
 * WeeklyReportPage renders the focused weekly report preview/post workflow.
 */
export function WeeklyReportPage(props: WeeklyReportPageProps): ReactElement {
	const { t } = useI18n();
	const report = useWeeklyReportPreview(props);
	const missingCount = report.preview?.missingCount ?? 0;
	const previewLoading = report.isBusy && report.preview === null;

	return (
		<div className="campfire-page-stack campfire-report-page-stack">

			<CampfireControlsPanel
				eyebrow={t('reports.preview.controls.eyebrow')}
				title={t('reports.preview.weekly.title')}
				description={t('reports.preview.weekly.description')}
				controls={(
					<div className="campfire-control-grid campfire-control-grid--weekly-report">
						<CampfireField id="campfire-weekly-report-start" label={t('reports.preview.field.periodStart')}>
							<CampfireDateInput
								id="campfire-weekly-report-start"
								disabled={report.isBusy}
								timezone={props.workspace.timezone}
								workingDays={props.workspace.workingDays}
								value={report.periodStart}
								onValueChange={report.setPeriodStart}
							/>
						</CampfireField>

						<CampfireField id="campfire-weekly-report-end" label={t('reports.preview.field.periodEnd')}>
							<CampfireDateInput
								id="campfire-weekly-report-end"
								disabled={report.isBusy}
								timezone={props.workspace.timezone}
								workingDays={props.workspace.workingDays}
								value={report.periodEnd}
								onValueChange={report.setPeriodEnd}
							/>
						</CampfireField>

						<CampfireField id="campfire-weekly-report-sort" label={t('reports.preview.field.sortMode')}>
							<CampfireSelect
								id="campfire-weekly-report-sort"
								disabled={report.isBusy}
								value={report.sortMode}
								onValueChange={value => report.setSortMode(toWeeklyReportSortMode(value))}
							>
								{weeklyReportSortOptions.map(sortMode => (
									<option key={sortMode} value={sortMode}>
										{translateReportSortMode(t, sortMode)}
									</option>
								))}
							</CampfireSelect>
						</CampfireField>

						<CampfireControlButton type="button" variant="outline" disabled={report.isBusy} onClick={report.resetToCurrentWeek}>
							<RotateCcw className="cf:size-4" />
							{t('reports.preview.action.thisWeek')}
						</CampfireControlButton>
					</div>
				)}
			>
				<ReportPreviewFeedback state={report.loadState} message={report.message} />
			</CampfireControlsPanel>


			{report.preview !== null && (
				<CampfireReportSummaryBar
					ariaLabel={t('reports.preview.summary.ariaLabel')}
					items={[
						{ label: t('reports.preview.summary.submitted'), value: String(report.preview.submittedCount), tone: 'success' },
						{ label: t('reports.preview.summary.missing'), value: String(missingCount), tone: missingCount > 0 ? 'danger' : 'neutral' },
						{ label: t('reports.preview.summary.onLeave'), value: String(report.preview.onLeaveCount), tone: 'neutral' },
						{ label: t('reports.preview.summary.days'), value: String(report.dailyPreviewCount), tone: 'neutral' },
						{ label: t('reports.preview.summary.markdownLines'), value: String(report.markdownLines), tone: 'neutral' },
					]}
				/>
			)}

			<ReportMarkdownPreview
				markdown={report.preview?.markdown ?? ''}
				disabled={report.isBusy || report.preview === null}
				loading={previewLoading}
				onPost={report.postReport}
			/>
		</div>
	);
}
