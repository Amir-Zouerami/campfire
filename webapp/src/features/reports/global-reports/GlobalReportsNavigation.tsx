import type { ReactElement } from 'react';
import { Clock3, Umbrella } from 'lucide-react';

import { globalReportTabClassName } from './global-reports.helpers';
import type { GlobalReportTab } from './global-reports.types';

/**
 * GlobalReportsNavigationProps contains active global report tab state.
 */
type GlobalReportsNavigationProps = {
	readonly activeTab: GlobalReportTab;
	readonly onSelectTab: (tab: GlobalReportTab) => void;
};

/**
 * GlobalReportsNavigation renders global report sub-navigation.
 */
export function GlobalReportsNavigation(props: GlobalReportsNavigationProps): ReactElement {
	return (
		<nav className="campfire-global-report-nav" aria-label="Global report type">
			<GlobalReportTabButton
				active={props.activeTab === 'time'}
				icon={Clock3}
				title="Global time"
				description="Time totals across active workspaces"
				onClick={() => props.onSelectTab('time')}
			/>

			<GlobalReportTabButton
				active={props.activeTab === 'leave'}
				icon={Umbrella}
				title="Global leave"
				description="Approved and pending leave across workspaces"
				onClick={() => props.onSelectTab('leave')}
			/>
		</nav>
	);
}

/**
 * GlobalReportTabButton renders one global report navigation button.
 */
function GlobalReportTabButton(props: {
	readonly active: boolean;
	readonly icon: typeof Clock3;
	readonly title: string;
	readonly description: string;
	readonly onClick: () => void;
}): ReactElement {
	const Icon = props.icon;

	return (
		<button
			type="button"
			className={globalReportTabClassName(props.active)}
			aria-current={props.active ? 'page' : undefined}
			onClick={props.onClick}
		>
			<span className="cf:flex cf:items-center cf:gap-2 cf:text-base cf:font-black">
				<Icon className="cf:size-5 cf:text-amber-200" />
				{props.title}
			</span>
			<span className="cf:text-sm cf:font-semibold cf:text-muted-foreground">{props.description}</span>
		</button>
	);
}
