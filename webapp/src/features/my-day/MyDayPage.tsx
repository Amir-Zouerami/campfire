import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { CalendarDays, CalendarOff, ClipboardCheck, Clock3, Flame, ListTodo } from 'lucide-react';

import { CampfirePageHeader, CampfireStatCard } from '@/components/campfire/CampfireLayoutPrimitives';
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
		description: 'Submit or update a valid working-day standup.',
	},
	{
		value: 'tasks',
		label: 'My Tasks',
		icon: ListTodo,
		description: 'Review and manage your Campfire tasks.',
	},
	{
		value: 'time',
		label: 'Time Log',
		icon: Clock3,
		description: 'Log time against active tasks.',
	},
	{
		value: 'leave',
		label: 'My Leave',
		icon: CalendarOff,
		description: 'Request leave and review active requests.',
	},
];

/**
 * MyDayPage renders the current user's flattened daily workflow.
 */
export function MyDayPage(props: WorkspaceShellProps): ReactElement {
	const [activeView, setActiveView] = useState<MyDayViewID>('overview');
	const today = useMemo(() => todayForWorkspace(props.workspace.timezone), [props.workspace.timezone]);

	return (
		<div className="campfire-page-stack campfire-my-day-page">
			<CampfirePageHeader title="My Day" description="Standup, tasks, time, and personal leave." />

			<CampfireSegmentedTabs
				label="My Day workflows"
				activeValue={activeView}
				tabs={myDayTabs}
				onChange={setActiveView}
			/>

			{activeView === 'overview' && (
				<>
					<div className="campfire-stat-grid campfire-stat-grid--three">
						<CampfireStatCard
							icon={CalendarDays}
							label="Today"
							value={formatReadableDate(today)}
							helper={props.workspace.timezone}
						/>
						<CampfireStatCard
							icon={ClipboardCheck}
							label="Standup"
							value="Working days"
							helper="Future and off-days blocked"
							tone="green"
						/>
						<CampfireStatCard icon={Clock3} label="Time" value="Tracked" helper="Tasks and entries" />
					</div>

					<MyStandupPage workspace={props.workspace} onStandupSubmitted={props.onStandupSubmitted} />
				</>
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

/**
 * todayForWorkspace returns today's YYYY-MM-DD date for the workspace timezone.
 */
function todayForWorkspace(timezone: string): string {
	const cleanTimezone = timezone.trim();
	if (cleanTimezone === '') {
		return localDateString(new Date());
	}

	try {
		const parts = new Intl.DateTimeFormat('en-US', {
			timeZone: cleanTimezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
		}).formatToParts(new Date());

		const year = parts.find(part => part.type === 'year')?.value ?? '';
		const month = parts.find(part => part.type === 'month')?.value ?? '';
		const day = parts.find(part => part.type === 'day')?.value ?? '';

		if (year !== '' && month !== '' && day !== '') {
			return `${year}-${month}-${day}`;
		}
	} catch {
		return localDateString(new Date());
	}

	return localDateString(new Date());
}

/**
 * localDateString returns a local YYYY-MM-DD string.
 */
function localDateString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

/**
 * formatReadableDate returns a compact human-readable date.
 */
function formatReadableDate(value: string): string {
	const [yearRaw, monthRaw, dayRaw] = value.split('-');
	const year = Number.parseInt(yearRaw ?? '', 10);
	const month = Number.parseInt(monthRaw ?? '', 10);
	const day = Number.parseInt(dayRaw ?? '', 10);

	if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
		return value;
	}

	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	}).format(new Date(year, month - 1, day));
}
