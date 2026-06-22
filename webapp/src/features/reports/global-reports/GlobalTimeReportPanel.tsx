import type { ReactElement } from 'react';
import { Globe2 } from 'lucide-react';

import { useUserProfiles } from '@/app/useUserProfiles';
import { CampfireControlsPanel } from '@/components/campfire/CampfireControlsPanel';
import { CampfireEmpty } from '@/components/campfire/CampfireLayoutPrimitives';
import { CampfirePageIntro } from '@/components/campfire/CampfirePageIntro';
import { CampfireReportSummaryBar } from '@/components/campfire/CampfireReportSummaryBar';
import { useI18n } from '@/i18n';

import { formatMinutes } from './global-reports.helpers';
import { globalReportGroupByLabel } from './global-reports.i18n';
import { GlobalReportsFeedback, GlobalReportsLoading } from './GlobalReportsFeedback';
import { GlobalTimeControls } from './GlobalTimeControls';
import { GlobalTimeRowsPanel } from './GlobalTimeRowsPanel';
import { GlobalTimeWorkspacePanel } from './GlobalTimeWorkspacePanel';
import { useGlobalTimeReport } from './useGlobalTimeReport';

/**
 * GlobalTimeReportPanelProps contains global time access state.
 */
type GlobalTimeReportPanelProps = {
	readonly isSystemAdmin: boolean;
};

/**
 * GlobalTimeReportPanel renders global time reports across workspaces.
 */
export function GlobalTimeReportPanel(props: GlobalTimeReportPanelProps): ReactElement {
	const { t } = useI18n();
	const report = useGlobalTimeReport(props.isSystemAdmin);
	const profiles = useUserProfiles(report.userIDsForProfiles);

	return (
		<div className="campfire-page-stack campfire-report-page-stack">
			<CampfirePageIntro
				eyebrow={t('reports.global.time.eyebrow')}
				title={t('reports.global.time.title')}
				description={t('reports.global.time.description')}
			/>

			<CampfireControlsPanel
				eyebrow={t('reports.global.controls.eyebrow')}
				title={t('reports.global.time.filters.title')}
				description={t('reports.global.time.filters.description')}
				controls={(
					<GlobalTimeControls
						filter={report.filter}
						disabled={report.isBusy}
						onChange={report.updateFilter}
						onLoad={report.loadReport}
						onExport={report.exportCSV}
					/>
				)}
			>
				<GlobalReportsFeedback
					state={report.loadState}
					message={report.message}
					profileErrorMessage={profiles.errorMessage}
				/>
			</CampfireControlsPanel>

			{report.loadState === 'loading' || report.loadState === 'exporting' ? <GlobalReportsLoading /> : null}

			{report.summary !== null && (
				<CampfireReportSummaryBar
					items={[
						{ label: t('reports.global.summary.totalTime'), value: formatMinutes(report.summary.totalMinutes), tone: 'success' },
						{ label: t('reports.global.summary.entries'), value: String(report.summary.entryCount), tone: 'neutral' },
						{ label: t('reports.global.summary.workspaces'), value: String(report.summary.workspaceCount), tone: 'neutral' },
						{ label: t('reports.global.summary.groupedBy'), value: globalReportGroupByLabel(report.filter.groupBy, t), tone: 'neutral' },
					]}
				/>
			)}

			{report.loadState !== 'loading' && report.summary === null && (
				<CampfireEmpty
					icon={Globe2}
					title={t('reports.global.time.empty.title')}
					description={t('reports.global.time.empty.description')}
				/>
			)}

			{report.loadState !== 'loading' && report.summary !== null && (
				<div className="campfire-page-stack">
					<GlobalTimeWorkspacePanel workspaces={report.summary.workspaces} />

					<GlobalTimeRowsPanel
						groupBy={report.summary.groupBy}
						rows={report.summary.rows}
						labelForUserID={profiles.labelForUserID}
					/>
				</div>
			)}
		</div>
	);
}
