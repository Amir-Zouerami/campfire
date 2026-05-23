import type { ReactElement } from 'react';
import { CalendarDays, FileText, RotateCcw, UserRoundCheck, UserRoundX, Umbrella } from 'lucide-react';

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

					<div className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5 cf:xl:grid-cols-[1fr_1fr_1.2fr_auto] cf:xl:items-end">
						<CampfireField id="campfire-weekly-report-start" label="Period start">
							<CampfireDateInput
								id="campfire-weekly-report-start"
								disabled={report.isBusy}
								value={report.periodStart}
								onValueChange={report.setPeriodStart}
							/>
						</CampfireField>

						<CampfireField id="campfire-weekly-report-end" label="Period end">
							<CampfireDateInput
								id="campfire-weekly-report-end"
								disabled={report.isBusy}
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

						<Button
							type="button"
							variant="outline"
							disabled={report.isBusy}
							onClick={report.resetToCurrentWeek}
						>
							<RotateCcw className="cf:size-4" />
							This week
						</Button>
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
