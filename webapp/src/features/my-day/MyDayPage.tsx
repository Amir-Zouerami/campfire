import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { CalendarOff, Clock3, Flame, ListTodo } from 'lucide-react';

import { CampfirePageHeader } from '@/components/campfire/CampfireLayoutPrimitives';
import { CampfireSegmentedTabs, type CampfireSegmentedTab } from '@/components/campfire/CampfireSegmentedTabs';
import type { TranslationKey } from '@/i18n';
import { useI18n } from '@/i18n';
import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { MyLeavePage } from './leave/MyLeavePage';
import { MyStandupPage } from './standup/MyStandupPage';
import { MyTasksPage } from './time/MyTasksPage';
import { MyTimeLogPage } from './time/MyTimeLogPage';

/**
 * MyDayViewID identifies the focused personal pages under My Day.
 */
type MyDayViewID = 'overview' | 'tasks' | 'time' | 'leave';

type MyDayTabDefinition = {
	readonly value: MyDayViewID;
	readonly labelKey: TranslationKey;
	readonly descriptionKey: TranslationKey;
	readonly icon: CampfireSegmentedTab<MyDayViewID>['icon'];
};

/**
 * myDayTabs defines the personal workflow navigation inside My Day.
 */
const myDayTabs: readonly MyDayTabDefinition[] = [
	{
		value: 'overview',
		labelKey: 'myDay.tabs.standup.label',
		icon: Flame,
		descriptionKey: 'myDay.tabs.standup.description',
	},
	{
		value: 'tasks',
		labelKey: 'myDay.tabs.tasks.label',
		icon: ListTodo,
		descriptionKey: 'myDay.tabs.tasks.description',
	},
	{
		value: 'time',
		labelKey: 'myDay.tabs.time.label',
		icon: Clock3,
		descriptionKey: 'myDay.tabs.time.description',
	},
	{
		value: 'leave',
		labelKey: 'myDay.tabs.leave.label',
		icon: CalendarOff,
		descriptionKey: 'myDay.tabs.leave.description',
	},
];

/**
 * MyDayPage renders the current user's personal daily workflows without team/admin chrome.
 */
export function MyDayPage(props: WorkspaceShellProps): ReactElement {
	const { t } = useI18n();
	const [activeView, setActiveView] = useState<MyDayViewID>('overview');
	const localizedTabs = useMemo<readonly CampfireSegmentedTab<MyDayViewID>[]>(() => {
		return myDayTabs.map(tab => ({
			value: tab.value,
			label: t(tab.labelKey),
			icon: tab.icon,
			description: t(tab.descriptionKey),
		}));
	}, [t]);

	return (
		<div className="campfire-page-stack campfire-my-day-page campfire-my-day-page--minimal">
			<CampfirePageHeader title={t('myDay.page.title')} description={t('myDay.page.description')} />

			<CampfireSegmentedTabs label={t('myDay.tabs.ariaLabel')} activeValue={activeView} tabs={localizedTabs} onChange={setActiveView} />

			{activeView === 'overview' && (
				<MyStandupPage
					workspace={props.workspace}
					canSubmitStandup={props.capabilities.canSubmitStandup}
					onStandupSubmitted={props.onStandupSubmitted}
				/>
			)}
			{activeView === 'tasks' && <MyTasksPage workspace={props.workspace} />}
			{activeView === 'time' && <MyTimeLogPage workspace={props.workspace} />}
			{activeView === 'leave' && (
				<MyLeavePage workspace={props.workspace} onLeaveCreated={props.onLeaveCreated} onLeaveCancelled={props.onLeaveCancelled} />
			)}
		</div>
	);
}
