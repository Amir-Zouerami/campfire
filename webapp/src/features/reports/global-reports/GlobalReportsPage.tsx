import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';

import { CampfireSegmentedTabs } from '@/components/campfire/CampfireSegmentedTabs';
import { useI18n } from '@/i18n';

import { GlobalLeaveReportPanel } from './GlobalLeaveReportPanel';
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
	const { t } = useI18n();
	const [activeTab, setActiveTab] = useState<GlobalReportTab>('time');
	const globalReportTabs = useMemo(() => [
		{
			value: 'time' as const,
			label: t('reports.global.tabs.time.label'),
			description: t('reports.global.tabs.time.description'),
		},
		{
			value: 'leave' as const,
			label: t('reports.global.tabs.leave.label'),
			description: t('reports.global.tabs.leave.description'),
		},
	], [t]);

	return (
		<div className="campfire-page-stack">
			<CampfireSegmentedTabs
				tabs={globalReportTabs}
				activeValue={activeTab}
				label={t('reports.global.tabs.ariaLabel')}
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
