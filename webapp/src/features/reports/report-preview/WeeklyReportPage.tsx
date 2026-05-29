import type { ReactElement } from 'react';
import { CalendarDays, FileText, RotateCcw, Rows3, UserRoundCheck, UserRoundX, Umbrella } from 'lucide-react';

import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { CampfireStatCard, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';
import { Button } from '@/components/ui/button';
import type { Workspace } from '@/types/domain';

import { formatReportSortMode, toWeeklyReportSortMode, weeklyReportSortOptions } from './report-preview.helpers';
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

	return (
		<div className="campfire-page-stack">
			<div className="campfire-stat-grid campfire-stat-grid--five">
				<CampfireStatCard
					icon={UserRoundCheck}
					label="Submitted"
					value={String(report.preview?.submittedCount ?? 0)}
					helper="Unique users"
					tone="green"
				/>
				<CampfireStatCard
					icon={UserRoundX}
					label="Missing"
					value={String(report.preview?.missingCount ?? 0)}
					helper="Across period"
					tone={(report.preview?.missingCount ?? 0) > 0 ? 'red' : 'slate'}
				/>
				<CampfireStatCard icon={Umbrella} label="On leave" value={String(report.preview?.onLeaveCount ?? 0)} helper="Leave-aware" />
				<CampfireStatCard icon={CalendarDays} label="Days" value={String(report.dailyPreviewCount)} helper="Daily previews" />
				<CampfireStatCard icon={Rows3} label="Markdown" value={String(report.markdownLines)} helper="Generated lines" />
			</div>

			<CampfireSurface className="campfire-control-surface">
				<header className="campfire-flat-section-header">
					<div>
						<p className="campfire-page-eyebrow">Weekly report</p>
						<h3 className="campfire-surface-title">Preview controls</h3>
						<p className="campfire-surface-description">
							Choose the report period and review one generated Markdown output.
						</p>
					</div>
					<FileText className="campfire-flat-header-icon" aria-hidden="true" />
				</header>

				<ReportPreviewFeedback state={report.loadState} message={report.message} />

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

					<Button type="button" variant="outline" disabled={report.isBusy} onClick={report.resetToCurrentWeek}>
						<RotateCcw className="cf:size-4" />
						This week
					</Button>
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
