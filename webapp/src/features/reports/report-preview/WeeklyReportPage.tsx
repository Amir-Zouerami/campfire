import type { ReactElement } from 'react';
import { CalendarDays, FileText, RotateCcw, Send, UserRoundCheck, UserRoundX, Umbrella } from 'lucide-react';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from '@/app/campfire-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Workspace } from '@/types/domain';

import {
	formatReportSortMode,
	selectClassName,
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

	return (
		<div className="cf:grid cf:gap-5">
			<CampfirePanel>
				<CampfireCardHeader
					eyebrow="Weekly report"
					title="Preview weekly Markdown"
					description="Pick a period, review the generated weekly summary, then copy or post it to the workspace channel."
					icon={FileText}
					action={<CampfireStatusPill tone="ember">Weekly</CampfireStatusPill>}
				/>

				<CampfireCardBody className="campfire-context-grid">
					<CampfireMetric
						label="Submitted"
						value={String(report.preview?.submittedCount ?? 0)}
						helper="Unique users"
						icon={UserRoundCheck}
					/>
					<CampfireMetric
						label="Missing"
						value={String(report.preview?.missingCount ?? 0)}
						helper="Across period"
						icon={UserRoundX}
					/>
					<CampfireMetric
						label="On leave"
						value={String(report.preview?.onLeaveCount ?? 0)}
						helper="Leave-aware"
						icon={Umbrella}
					/>
					<CampfireMetric
						label="Days"
						value={String(report.dailyPreviewCount)}
						helper="Daily previews"
						icon={CalendarDays}
					/>
				</CampfireCardBody>
			</CampfirePanel>

			<CampfirePanel>
				<CampfireCardBody className="cf:grid cf:gap-5">
					<ReportPreviewFeedback state={report.loadState} message={report.message} />

					<div className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5 cf:xl:grid-cols-[1fr_1fr_1.2fr_auto] cf:xl:items-end">
						<div className="cf:grid cf:gap-2">
							<Label htmlFor="campfire-weekly-report-start">Period start</Label>
							<Input
								id="campfire-weekly-report-start"
								type="date"
								disabled={report.isBusy}
								value={report.periodStart}
								onChange={event => report.setPeriodStart(event.currentTarget.value)}
							/>
						</div>

						<div className="cf:grid cf:gap-2">
							<Label htmlFor="campfire-weekly-report-end">Period end</Label>
							<Input
								id="campfire-weekly-report-end"
								type="date"
								disabled={report.isBusy}
								value={report.periodEnd}
								onChange={event => report.setPeriodEnd(event.currentTarget.value)}
							/>
						</div>

						<div className="cf:grid cf:gap-2">
							<Label htmlFor="campfire-weekly-report-sort">Sort by</Label>
							<select
								id="campfire-weekly-report-sort"
								className={selectClassName()}
								disabled={report.isBusy}
								value={report.sortMode}
								onChange={event =>
									report.setSortMode(toWeeklyReportSortMode(event.currentTarget.value))
								}
							>
								{weeklyReportSortOptions.map(sortMode => (
									<option key={sortMode} value={sortMode}>
										{formatReportSortMode(sortMode)}
									</option>
								))}
							</select>
						</div>

						<Button
							type="button"
							variant="secondary"
							disabled={report.isBusy}
							onClick={report.resetToCurrentWeek}
						>
							<RotateCcw className="cf:size-4" />
							This week
						</Button>
					</div>

					{report.loadState === 'loading' && <ReportPreviewLoading />}

					{report.loadState !== 'loading' && (
						<ReportMarkdownPreview
							markdown={report.preview?.markdown ?? ''}
							disabled={report.isBusy}
							onPost={report.postReport}
						/>
					)}

					{report.loadState !== 'loading' && report.preview !== null && (
						<div className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5">
							<p className="cf:text-sm cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
								Preview summary
							</p>
							<p className="cf:mt-2 cf:text-sm cf:font-semibold cf:leading-7 cf:text-slate-300">
								This weekly preview includes {report.dailyPreviewCount} daily preview
								{report.dailyPreviewCount === 1 ? '' : 's'} and {report.markdownLines} Markdown line
								{report.markdownLines === 1 ? '' : 's'}.
							</p>

							<div className="cf:mt-4 cf:flex cf:flex-wrap cf:gap-2">
								<CampfireStatusPill tone="green">
									<UserRoundCheck className="cf:size-3.5" />
									{report.preview.submittedCount} submitted
								</CampfireStatusPill>
								<CampfireStatusPill tone="red">
									<UserRoundX className="cf:size-3.5" />
									{report.preview.missingCount} missing
								</CampfireStatusPill>
								<CampfireStatusPill tone="slate">
									<Umbrella className="cf:size-3.5" />
									{report.preview.onLeaveCount} on leave
								</CampfireStatusPill>
								<CampfireStatusPill tone="ember">
									<Send className="cf:size-3.5" />
									{report.markdownLines} lines
								</CampfireStatusPill>
							</div>
						</div>
					)}
				</CampfireCardBody>
			</CampfirePanel>
		</div>
	);
}
