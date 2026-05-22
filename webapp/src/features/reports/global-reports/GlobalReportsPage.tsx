import { useState } from 'react';
import type { ReactElement } from 'react';

import { GlobalLeaveReportPanel } from './GlobalLeaveReportPanel';
import { GlobalReportsNavigation } from './GlobalReportsNavigation';
import { GlobalTimeReportPanel } from './GlobalTimeReportPanel';
import type { GlobalReportTab } from './global-reports.types';

/**
 * GlobalReportsPageProps contains global report access state.
 */
type GlobalReportsPageProps = {
	readonly isSystemAdmin: boolean;
};

/**
 * GlobalReportsPage renders global report sub-pages for Admins.
 */
export function GlobalReportsPage(props: GlobalReportsPageProps): ReactElement {
	const [activeTab, setActiveTab] = useState<GlobalReportTab>('time');

	return (
		<div className="cf:grid cf:gap-5">
			<GlobalReportsNavigation activeTab={activeTab} onSelectTab={setActiveTab} />

			{activeTab === 'time' ? (
				<GlobalTimeReportPanel isSystemAdmin={props.isSystemAdmin} />
			) : (
				<GlobalLeaveReportPanel isSystemAdmin={props.isSystemAdmin} />
			)}
		</div>
	);
}
