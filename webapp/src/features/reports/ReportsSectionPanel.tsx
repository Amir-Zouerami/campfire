import type { ReactElement } from 'react';

import { CSVExportsCard } from '@/app/CSVExportsCard';
import { DailyReportPreviewCard } from '@/app/DailyReportPreviewCard';
import { GlobalLeaveReportsCard } from '@/app/GlobalLeaveReportsCard';
import { GlobalReportsCard } from '@/app/GlobalReportsCard';
import { SavedReportFiltersCard } from '@/app/SavedReportFiltersCard';
import { TimeReportSummaryCard } from '@/app/TimeReportSummaryCard';
import { WeeklyReportPreviewCard } from '@/app/WeeklyReportPreviewCard';

import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import type { ReportsSectionID } from './reports.types';

/**
 * ReportsSectionPanelProps contains the selected report section.
 */
type ReportsSectionPanelProps = WorkspaceShellProps & {
	readonly activeSection: ReportsSectionID;
};

/**
 * ReportsSectionPanel renders the selected report sub-page.
 */
export function ReportsSectionPanel(props: ReportsSectionPanelProps): ReactElement {
	switch (props.activeSection) {
		case 'daily':
			return <DailyReportPreviewCard workspace={props.workspace} refreshToken={props.standupRefreshToken} />;

		case 'weekly':
			return <WeeklyReportPreviewCard workspace={props.workspace} refreshToken={props.standupRefreshToken} />;

		case 'time':
			return <TimeReportSummaryCard workspace={props.workspace} />;

		case 'exports':
			return <CSVExportsCard workspace={props.workspace} />;

		case 'saved':
			return <SavedReportFiltersCard workspace={props.workspace} />;

		case 'global':
			return (
				<div className="cf:grid cf:gap-5 cf:xl:grid-cols-2">
					<GlobalReportsCard isSystemAdmin={props.isSystemAdmin} />
					<GlobalLeaveReportsCard isSystemAdmin={props.isSystemAdmin} />
				</div>
			);
	}
}
