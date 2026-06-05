import type { ReactElement } from 'react';

import { CampfireControlsPanel } from '@/components/campfire/CampfireControlsPanel';
import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireReportSummaryBar } from '@/components/campfire/CampfireReportSummaryBar';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import type { Workspace } from '@/types/domain';

import {
	dailyReportSortOptions,
	formatReportSortMode,
	toDailyReportSortMode,
} from './report-preview.helpers';
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
	const report = useDailyReportPreview(props);

	return (
		<div className="campfire-page-stack campfire-report-page-stack">

			<CampfireControlsPanel
				eyebrow="Filters"
				title="Daily preview"
				description="Small controls, one generated report."
				controls={(
					<div className="campfire-control-grid campfire-control-grid--daily-report">
						<CampfireField id="campfire-daily-report-date" label="Report date">
							<CampfireDateInput
								id="campfire-daily-report-date"
								disabled={report.isBusy}
								timezone={props.workspace.timezone}
								value={report.occurrenceDate}
								onValueChange={report.setOccurrenceDate}
							/>
						</CampfireField>

						<CampfireField id="campfire-daily-report-sort" label="Sort mode">
							<CampfireSelect
								id="campfire-daily-report-sort"
								disabled={report.isBusy}
								value={report.sortMode}
								onValueChange={value => report.setSortMode(toDailyReportSortMode(value))}
							>
								{dailyReportSortOptions.map(sortMode => (
									<option key={sortMode} value={sortMode}>
										{formatReportSortMode(sortMode)}
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
					items={[
						{ label: 'Submitted', value: String(report.submittedCount), tone: 'success' },
						{ label: 'Missing', value: String(report.missingCount), tone: report.missingCount > 0 ? 'danger' : 'neutral' },
						{ label: 'On leave', value: String(report.onLeaveCount), tone: 'neutral' },
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
