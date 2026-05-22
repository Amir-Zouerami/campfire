import type { ReactElement } from 'react';
import { FileText, Send, UserRoundCheck, UserRoundX, Umbrella } from 'lucide-react';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from '@/app/campfire-ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Workspace } from '@/types/domain';

import {
	dailyReportSortOptions,
	formatReportSortMode,
	selectClassName,
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
		<div className="cf:grid cf:gap-5">
			<CampfirePanel>
				<CampfireCardHeader
					eyebrow="Daily report"
					title="Preview daily Markdown"
					description="Pick a date, review the generated report, then copy or post it to the workspace channel."
					icon={FileText}
					action={<CampfireStatusPill tone="ember">Daily</CampfireStatusPill>}
				/>

				<CampfireCardBody className="campfire-context-grid">
					<CampfireMetric
						label="Submitted"
						value={String(report.submittedCount)}
						helper="Included users"
						icon={UserRoundCheck}
					/>
					<CampfireMetric
						label="Missing"
						value={String(report.missingCount)}
						helper="Follow-up users"
						icon={UserRoundX}
					/>
					<CampfireMetric
						label="On leave"
						value={String(report.onLeaveCount)}
						helper="Leave-aware report"
						icon={Umbrella}
					/>
					<CampfireMetric
						label="Markdown"
						value={String(report.markdownLines)}
						helper="Preview lines"
						icon={Send}
					/>
				</CampfireCardBody>
			</CampfirePanel>

			<CampfirePanel>
				<CampfireCardBody className="cf:grid cf:gap-5">
					<ReportPreviewFeedback state={report.loadState} message={report.message} />

					<div className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5 cf:md:grid-cols-[16rem_1fr]">
						<div className="cf:grid cf:gap-2">
							<Label htmlFor="campfire-daily-report-date">Report date</Label>
							<Input
								id="campfire-daily-report-date"
								type="date"
								disabled={report.isBusy}
								value={report.occurrenceDate}
								onChange={event => report.setOccurrenceDate(event.currentTarget.value)}
							/>
						</div>

						<div className="cf:grid cf:gap-2">
							<Label htmlFor="campfire-daily-report-sort">Sort by</Label>
							<select
								id="campfire-daily-report-sort"
								className={selectClassName()}
								disabled={report.isBusy}
								value={report.sortMode}
								onChange={event => report.setSortMode(toDailyReportSortMode(event.currentTarget.value))}
							>
								{dailyReportSortOptions.map(sortMode => (
									<option key={sortMode} value={sortMode}>
										{formatReportSortMode(sortMode)}
									</option>
								))}
							</select>
						</div>
					</div>

					{report.loadState === 'loading' && <ReportPreviewLoading />}

					{report.loadState !== 'loading' && (
						<ReportMarkdownPreview
							markdown={report.preview?.markdown ?? ''}
							disabled={report.isBusy}
							onPost={report.postReport}
						/>
					)}
				</CampfireCardBody>
			</CampfirePanel>
		</div>
	);
}
