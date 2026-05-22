import type { ReactElement } from 'react';

import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { CSVExportsPage } from './csv-exports/CSVExportsPage';
import { GlobalReportsPage } from './global-reports/GlobalReportsPage';
import { DailyReportPage } from './report-preview/DailyReportPage';
import { WeeklyReportPage } from './report-preview/WeeklyReportPage';
import type { ReportsSectionID } from './reports.types';
import { SavedFiltersPage } from './saved-filters/SavedFiltersPage';
import { TimeReportsPage } from './time-report/TimeReportsPage';

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
			return <DailyReportPage workspace={props.workspace} refreshToken={props.standupRefreshToken} />;

		case 'weekly':
			return <WeeklyReportPage workspace={props.workspace} refreshToken={props.standupRefreshToken} />;

		case 'time':
			return <TimeReportsPage workspace={props.workspace} />;

		case 'exports':
			return <CSVExportsPage workspace={props.workspace} />;

		case 'saved':
			return <SavedFiltersPage workspace={props.workspace} />;

		case 'global':
			return <GlobalReportsPage isSystemAdmin={props.isSystemAdmin} />;
	}
}
