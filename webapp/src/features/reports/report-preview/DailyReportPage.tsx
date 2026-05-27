import type { ReactElement } from 'react';
import { FileText, UserRoundCheck, UserRoundX, Umbrella } from 'lucide-react';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from '@/app/campfire-ui';
import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import type { Workspace } from '@/types/domain';

import { dailyReportSortOptions, formatReportSortMode, toDailyReportSortMode } from './report-preview.helpers';
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
				</CampfireCardBody>
			</CampfirePanel>

			<CampfirePanel>
				<CampfireCardBody className="cf:grid cf:gap-5">
					<ReportPreviewFeedback state={report.loadState} message={report.message} />

					<div className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5 cf:md:grid-cols-[16rem_1fr]">
						<CampfireField id="campfire-daily-report-date" label="Report date">
							<CampfireDateInput
								id="campfire-daily-report-date"
								disabled={report.isBusy}
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

					{report.loadState === 'loading' && <ReportPreviewLoading />}

					<ReportMarkdownPreview
						markdown={report.preview?.markdown ?? ''}
						disabled={report.isBusy || report.preview === null}
						onPost={report.postReport}
					/>
				</CampfireCardBody>
			</CampfirePanel>
		</div>
	);
}
