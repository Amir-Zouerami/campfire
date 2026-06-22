import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';

import { CampfirePageHeader } from '@/components/campfire/CampfireLayoutPrimitives';
import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';
import { useI18n } from '@/i18n';

import { CSVExportsPage } from './csv-exports/CSVExportsPage';
import { GlobalReportsPage } from './global-reports/GlobalReportsPage';
import { DailyReportPage } from './report-preview/DailyReportPage';
import { WeeklyReportPage } from './report-preview/WeeklyReportPage';
import { ReportsSectionNavigation } from './ReportsSectionNavigation';
import { RestrictedReportsState } from './RestrictedReportsState';
import { canViewReportsPage, resolveReportSection, visibleReportSections } from './reports.helpers';
import type { ReportsSectionID } from './reports.types';
import { SavedFiltersPage } from './saved-filters/SavedFiltersPage';
import { TimeReportsPage } from './time-report/TimeReportsPage';

/**
 * ReportsPage renders report previews, summaries, filters, CSV, and global reports.
 */
export function ReportsPage(props: WorkspaceShellProps): ReactElement {
	const { t } = useI18n();
	const [activeSection, setActiveSection] = useState<ReportsSectionID>('daily');

	const visibleSections = useMemo(() => {
		return visibleReportSections(props);
	}, [props]);

	const resolvedSection = useMemo(() => {
		return resolveReportSection(activeSection, visibleSections);
	}, [activeSection, visibleSections]);

	if (!canViewReportsPage(props) || resolvedSection === null) {
		return <RestrictedReportsState />;
	}

	return (
		<div className="campfire-page-stack">
			<CampfirePageHeader
				eyebrow={t('reports.page.eyebrow')}
				title={t(resolvedSection.labelKey)}
				description={t(resolvedSection.descriptionKey)}
			/>

			<ReportsSectionNavigation
				activeSection={resolvedSection.id}
				sections={visibleSections}
				onSelectSection={setActiveSection}
			/>

			{renderReportsSection(resolvedSection.id, props)}
		</div>
	);
}

/**
 * renderReportsSection renders the currently selected report workflow without
 * an extra pass-through section panel component.
 */
function renderReportsSection(activeSection: ReportsSectionID, props: WorkspaceShellProps): ReactElement {
	switch (activeSection) {
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
