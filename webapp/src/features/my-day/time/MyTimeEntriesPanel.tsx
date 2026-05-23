import type { ReactElement } from 'react';
import { Clock3 } from 'lucide-react';

import { CampfireEmpty, CampfireStatusPill } from '@/app/campfire-ui';
import type { Task, TimeEntry } from '@/types/domain';

import { formatMinutes, taskLabelForID } from './my-time.helpers';

/**
 * MyTimeEntriesPanelProps contains recent time entries and task labels.
 */
type MyTimeEntriesPanelProps = {
	readonly entries: readonly TimeEntry[];
	readonly tasksByID: Readonly<Record<string, Task>>;
};

/**
 * MyTimeEntriesPanel renders recent current-user time entries.
 */
export function MyTimeEntriesPanel(props: MyTimeEntriesPanelProps): ReactElement {
	return (
		<section className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5">
			<div>
				<p className="cf:text-sm cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
					Recent time
				</p>
				<h3 className="cf:mt-1 cf:text-xl cf:font-black cf:tracking-[-0.03em] cf:text-foreground">
					Last 14 days
				</h3>
			</div>

			{props.entries.length === 0 ? (
				<CampfireEmpty
					icon={Clock3}
					title="No recent time"
					description="Log time against a task to make reports useful."
				/>
			) : (
				<div className="cf:grid cf:gap-3">
					{props.entries.map(entry => (
						<TimeEntryRow key={entry.id} entry={entry} tasksByID={props.tasksByID} />
					))}
				</div>
			)}
		</section>
	);
}

/**
 * TimeEntryRow renders one recent time entry.
 */
function TimeEntryRow(props: {
	readonly entry: TimeEntry;
	readonly tasksByID: Readonly<Record<string, Task>>;
}): ReactElement {
	return (
		<article className="cf:flex cf:flex-col cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4 cf:sm:flex-row cf:sm:items-start cf:sm:justify-between">
			<div className="cf:min-w-0">
				<strong className="cf:block cf:text-base cf:font-black cf:text-foreground">
					{props.entry.entryDate}
				</strong>
				<p className="cf:mt-1 cf:text-sm cf:font-semibold cf:text-muted-foreground" title={props.entry.taskId}>
					{taskLabelForID(props.tasksByID, props.entry.taskId)}
				</p>

				<div className="cf:mt-3 cf:flex cf:flex-wrap cf:gap-2">
					<TimeMetaChip label="Project" value={props.entry.projectId} />
					<TimeMetaChip label="Category" value={props.entry.categoryId} />
				</div>

				{props.entry.note.trim() !== '' && (
					<p className="cf:mt-3 cf:text-sm cf:font-semibold cf:leading-6 cf:text-slate-300">
						{props.entry.note}
					</p>
				)}
			</div>

			<CampfireStatusPill tone="green">
				<Clock3 className="cf:size-3.5" />
				{formatMinutes(props.entry.minutes)}
			</CampfireStatusPill>
		</article>
	);
}

/**
 * TimeMetaChip renders optional time metadata.
 */
function TimeMetaChip(props: { readonly label: string; readonly value: string }): ReactElement | null {
	if (props.value.trim() === '') {
		return null;
	}

	return (
		<span className="cf:max-w-full cf:truncate cf:rounded-full cf:border cf:border-emerald-300/20 cf:bg-emerald-300/10 cf:px-2.5 cf:py-1 cf:text-xs cf:font-black cf:text-emerald-100">
			{props.label}: {props.value}
		</span>
	);
}
