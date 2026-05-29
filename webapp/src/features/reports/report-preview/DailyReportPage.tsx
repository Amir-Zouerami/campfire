import type { ReactElement } from 'react';
import { Rows3, UserRoundCheck, UserRoundX, Umbrella } from 'lucide-react';

import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { CampfireStatCard, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';
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
		<div className="campfire-page-stack">
			<div className="campfire-stat-grid campfire-stat-grid--four">
				<CampfireStatCard
					icon={UserRoundCheck}
					label="Submitted"
					value={String(report.submittedCount)}
					helper="Included users"
					tone="green"
				/>
				<CampfireStatCard
					icon={UserRoundX}
					label="Missing"
					value={String(report.missingCount)}
					helper="Follow-up users"
					tone={report.missingCount > 0 ? 'red' : 'slate'}
				/>
				<CampfireStatCard icon={Umbrella} label="On leave" value={String(report.onLeaveCount)} helper="Leave-aware" />
				<CampfireStatCard icon={Rows3} label="Markdown" value={String(report.markdownLines)} helper="Generated lines" />
			</div>

			<CampfireSurface className="campfire-control-surface">
				<header className="campfire-flat-section-header">
					<div>
						<p className="campfire-page-eyebrow">Daily report</p>
						<h3 className="campfire-surface-title">Preview controls</h3>
						<p className="campfire-surface-description">
							Pick a date and sort mode, then review the generated Markdown below.
						</p>
					</div>
				</header>

				<ReportPreviewFeedback state={report.loadState} message={report.message} />

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
			</CampfireSurface>

			{report.loadState === 'loading' && <ReportPreviewLoading />}

			<ReportMarkdownPreview
				markdown={report.preview?.markdown ?? ''}
				disabled={report.isBusy || report.preview === null}
				onPost={report.postReport}
			/>
		</div>
	);
}
