import { useState } from 'react';
import type { ReactElement } from 'react';
import { CalendarOff, Clock3, Flame, ListTodo } from 'lucide-react';

import { CampfirePageHeader } from '@/components/campfire/CampfireLayoutPrimitives';
import { CampfireSegmentedTabs, type CampfireSegmentedTab } from '@/components/campfire/CampfireSegmentedTabs';
import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { MyLeavePage } from './leave/MyLeavePage';
import { MyStandupPage } from './standup/MyStandupPage';
import { MyTasksPage } from './time/MyTasksPage';
import { MyTimeLogPage } from './time/MyTimeLogPage';

/**
 * MyDayViewID identifies the focused personal pages under My Day.
 */
type MyDayViewID = 'overview' | 'tasks' | 'time' | 'leave';

/**
 * myDayTabs defines the personal workflow navigation inside My Day.
 */
const myDayTabs: readonly CampfireSegmentedTab<MyDayViewID>[] = [
	{
		value: 'overview',
		label: 'Standup',
		icon: Flame,
		description: 'Submit or update your current standup.',
	},
	{
		value: 'tasks',
		label: 'My Tasks',
		icon: ListTodo,
		description: 'Review and update your tasks.',
	},
	{
		value: 'time',
		label: 'Time Log',
		icon: Clock3,
		description: 'Log and review your tracked time.',
	},
	{
		value: 'leave',
		label: 'My Leave',
		icon: CalendarOff,
		description: 'Request leave and manage your active requests.',
	},
];

/**
 * MyDayPage renders the current user's personal daily workflows without team/admin chrome.
 */
export function MyDayPage(props: WorkspaceShellProps): ReactElement {
	const [activeView, setActiveView] = useState<MyDayViewID>('overview');

	return (
		<div className="campfire-page-stack campfire-my-day-page campfire-my-day-page--minimal">
			<CampfirePageHeader title="My Day" description="Your standup, tasks, time, and leave." />

			<CampfireSegmentedTabs
				label="My Day workflows"
				activeValue={activeView}
				tabs={myDayTabs}
				onChange={setActiveView}
			/>

			{activeView === 'overview' && (
				<MyStandupPage workspace={props.workspace} onStandupSubmitted={props.onStandupSubmitted} />
			)}
			{activeView === 'tasks' && <MyTasksPage workspace={props.workspace} />}
			{activeView === 'time' && <MyTimeLogPage workspace={props.workspace} />}
			{activeView === 'leave' && (
				<MyLeavePage
					workspace={props.workspace}
					onLeaveCreated={props.onLeaveCreated}
					onLeaveCancelled={props.onLeaveCancelled}
				/>
			)}
		</div>
	);
}
