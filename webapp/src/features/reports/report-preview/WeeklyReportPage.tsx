import type { ReactElement } from 'react';
import { RotateCcw } from 'lucide-react';

import { CampfireControlButton } from '@/components/campfire/CampfireControlButton';
import { CampfireControlsPanel } from '@/components/campfire/CampfireControlsPanel';
import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireReportSummaryBar } from '@/components/campfire/CampfireReportSummaryBar';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import type { Workspace } from '@/types/domain';

import {
	formatReportSortMode,
	toWeeklyReportSortMode,
	weeklyReportSortOptions,
} from './report-preview.helpers';
import { ReportMarkdownPreview } from './ReportMarkdownPreview';
import { ReportPreviewFeedback, ReportPreviewLoading } from './ReportPreviewFeedback';
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
	const report = useWeeklyReportPreview(props);
	const missingCount = report.preview?.missingCount ?? 0;

	return (
		<div className="campfire-page-stack campfire-report-page-stack">

			<CampfireControlsPanel
				eyebrow="Filters"
				title="Weekly preview"
				description="The report uses the selected range and workspace working-day rules."
				controls={(
					<div className="campfire-control-grid campfire-control-grid--weekly-report">
						<CampfireField id="campfire-weekly-report-start" label="Period start">
							<CampfireDateInput
								id="campfire-weekly-report-start"
								disabled={report.isBusy}
								timezone={props.workspace.timezone}
								value={report.periodStart}
								onValueChange={report.setPeriodStart}
							/>
						</CampfireField>

						<CampfireField id="campfire-weekly-report-end" label="Period end">
							<CampfireDateInput
								id="campfire-weekly-report-end"
								disabled={report.isBusy}
								timezone={props.workspace.timezone}
								value={report.periodEnd}
								onValueChange={report.setPeriodEnd}
							/>
						</CampfireField>

						<CampfireField id="campfire-weekly-report-sort" label="Sort mode">
							<CampfireSelect
								id="campfire-weekly-report-sort"
								disabled={report.isBusy}
								value={report.sortMode}
								onValueChange={value => report.setSortMode(toWeeklyReportSortMode(value))}
							>
								{weeklyReportSortOptions.map(sortMode => (
									<option key={sortMode} value={sortMode}>
										{formatReportSortMode(sortMode)}
									</option>
								))}
							</CampfireSelect>
						</CampfireField>

						<CampfireControlButton type="button" variant="outline" disabled={report.isBusy} onClick={report.resetToCurrentWeek}>
							<RotateCcw className="cf:size-4" />
							This week
						</CampfireControlButton>
					</div>
				)}
			>
				<ReportPreviewFeedback state={report.loadState} message={report.message} />
			</CampfireControlsPanel>

			{report.loadState === 'loading' && <ReportPreviewLoading />}

			{report.preview !== null && (
				<CampfireReportSummaryBar
					items={[
						{ label: 'Submitted', value: String(report.preview.submittedCount), tone: 'success' },
						{ label: 'Missing', value: String(missingCount), tone: missingCount > 0 ? 'danger' : 'neutral' },
						{ label: 'On leave', value: String(report.preview.onLeaveCount), tone: 'neutral' },
						{ label: 'Days', value: String(report.dailyPreviewCount), tone: 'neutral' },
						{ label: 'Markdown lines', value: String(report.markdownLines), tone: 'neutral' },
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
