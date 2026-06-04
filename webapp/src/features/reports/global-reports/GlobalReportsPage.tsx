import { useState } from 'react';
import type { ReactElement } from 'react';

import { CampfireSegmentedTabs } from '@/components/campfire/CampfireSegmentedTabs';

import { GlobalLeaveReportPanel } from './GlobalLeaveReportPanel';
import { GlobalTimeReportPanel } from './GlobalTimeReportPanel';
import type { GlobalReportTab } from './global-reports.types';

/**
 * GlobalReportsPageProps contains global report access state.
 */
type GlobalReportsPageProps = {
	readonly isSystemAdmin: boolean;
};

const globalReportTabs = [
	{
		value: 'time',
		label: 'Global time',
		description: 'Time totals across active workspaces',
	},
	{
		value: 'leave',
		label: 'Global leave',
		description: 'Approved and pending leave across workspaces',
	},
] as const;

/**
 * GlobalReportsPage renders global report sub-pages for Admins.
 */
export function GlobalReportsPage(props: GlobalReportsPageProps): ReactElement {
	const [activeTab, setActiveTab] = useState<GlobalReportTab>('time');

	return (
		<div className="campfire-page-stack">
			<CampfireSegmentedTabs
				tabs={globalReportTabs}
				activeValue={activeTab}
				label="Global report type"
				onChange={setActiveTab}
			/>

			{activeTab === 'time' ? (
				<GlobalTimeReportPanel isSystemAdmin={props.isSystemAdmin} />
			) : (
				<GlobalLeaveReportPanel isSystemAdmin={props.isSystemAdmin} />
			)}
		</div>
	);
}
