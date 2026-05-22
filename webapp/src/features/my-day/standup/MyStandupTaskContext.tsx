import type { ReactElement } from 'react';
import { TimerReset } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { Task } from '@/types/domain';

/**
 * MyStandupTaskContextProps contains active tasks shown beside the check-in flow.
 */
type MyStandupTaskContextProps = {
	readonly activeTasks: readonly Task[];
};

/**
 * MyStandupTaskContext renders lightweight task context without turning standup into a report page.
 */
export function MyStandupTaskContext(props: MyStandupTaskContextProps): ReactElement | null {
	if (props.activeTasks.length === 0) {
		return null;
	}

	return (
		<aside className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4">
			<div className="cf:flex cf:items-center cf:gap-2">
				<TimerReset className="cf:size-4 cf:text-amber-200" />
				<p className="cf:text-sm cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
					Active task context
				</p>
			</div>

			<div className="cf:mt-3 cf:flex cf:flex-wrap cf:gap-2">
				{props.activeTasks.slice(0, 5).map(task => (
					<Badge key={task.id} variant="outline" className="cf:max-w-full cf:truncate">
						{task.title}
					</Badge>
				))}

				{props.activeTasks.length > 5 && (
					<Badge variant="secondary">+{props.activeTasks.length - 5} more</Badge>
				)}
			</div>
		</aside>
	);
}
