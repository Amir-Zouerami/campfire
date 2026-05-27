import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';

import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { ReportsSectionNavigation } from './ReportsSectionNavigation';
import { ReportsSectionPanel } from './ReportsSectionPanel';
import { RestrictedReportsState } from './RestrictedReportsState';
import { canViewReportsPage, resolveReportSection, visibleReportSections } from './reports.helpers';
import type { ReportsSectionID } from './reports.types';

/**
 * ReportsPage renders report previews, summaries, filters, CSV, and global reports.
 */
export function ReportsPage(props: WorkspaceShellProps): ReactElement {
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
		<div className="cf:grid cf:gap-4">
			<ReportsSectionNavigation
				activeSection={resolvedSection.id}
				sections={visibleSections}
				onSelectSection={setActiveSection}
			/>

			<ReportsSectionPanel activeSection={resolvedSection.id} {...props} />
		</div>
	);
}
