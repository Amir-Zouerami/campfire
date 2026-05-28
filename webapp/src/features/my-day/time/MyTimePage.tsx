import type { ReactElement } from 'react';

import { CampfireCardBody, CampfireEmpty, CampfirePanel } from '@/app/campfire-ui';
import type { Workspace } from '@/types/domain';

import { MyTaskCreatePanel } from './MyTaskCreatePanel';
import { MyTaskListPanel } from './MyTaskListPanel';
import { MyTimeEntriesPanel } from './MyTimeEntriesPanel';
import { MyTimeEntryPanel } from './MyTimeEntryPanel';
import { MyTimeFeedback, MyTimeLoading } from './MyTimeFeedback';
import { MyTimeHero } from './MyTimeHero';
import { useMyTimeLog } from './useMyTimeLog';

/**
 * MyTimePageProps contains workspace context for personal tasks/time.
 */
type MyTimePageProps = {
	readonly workspace: Workspace;
};

/**
 * MyTimePage renders the rewritten My Day tasks/time workflow.
 */
export function MyTimePage(props: MyTimePageProps): ReactElement {
	const timeLog = useMyTimeLog({
		workspace: props.workspace,
	});

	return (
		<div className="cf:grid cf:gap-5">
			<MyTimeHero
				activeTaskCount={timeLog.activeTaskCount}
				totalTaskCount={timeLog.tasks.length}
				recentMinutes={timeLog.totalRecentMinutes}
			/>

			<CampfirePanel>
				<CampfireCardBody className="cf:grid cf:gap-5">
					<MyTimeFeedback state={timeLog.loadState} message={timeLog.message} />

					{timeLog.loadState === 'loading' && <MyTimeLoading />}

					{timeLog.loadState !== 'loading' && (
						<>
							<div className="cf:grid cf:items-start cf:gap-5 cf:xl:grid-cols-2">
								<MyTaskCreatePanel
									draft={timeLog.taskDraft}
									disabled={timeLog.isBusy}
									onChange={timeLog.updateTaskDraft}
									onSubmit={timeLog.submitTask}
								/>
								<MyTimeEntryPanel
									draft={timeLog.timeDraft}
									tasks={timeLog.loggableTasks}
									disabled={timeLog.isBusy}
									onTaskChange={timeLog.handleTimeTaskChange}
									onChange={timeLog.updateTimeDraft}
									onSubmit={timeLog.submitTimeEntry}
								/>
							</div>

							{timeLog.tasks.length === 0 && (
								<CampfireEmpty
									title="Start with a task"
									description="Create a task on the left, then log time against it. Time entries can use any date."
								/>
							)}

							<div className="cf:grid cf:gap-5 cf:xl:grid-cols-[1.1fr_0.9fr]">
								<MyTaskListPanel
									tasks={timeLog.tasks}
									includeArchived={timeLog.includeArchived}
									disabled={timeLog.isBusy}
									onIncludeArchivedChange={timeLog.setIncludeArchived}
									onStatusChange={(taskId, status) => {
										void timeLog.changeTaskStatus(taskId, status);
									}}
								/>

								<MyTimeEntriesPanel entries={timeLog.timeEntries} tasksByID={timeLog.tasksByID} />
							</div>
						</>
					)}
				</CampfireCardBody>
			</CampfirePanel>
		</div>
	);
}
