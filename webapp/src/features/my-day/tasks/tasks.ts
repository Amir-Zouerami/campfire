import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createTask, listMyTasks, updateTask } from '@/shared/api';
import type { TranslationKey } from '@/shared/i18n';
import type { QueryKey } from '@/shared/query/keys';
import { workspaceKey } from '@/shared/query/keys';
import { useWorkspaceID } from '@/shared/session';
import type { CreateTaskRequest } from '@/shared/types/api';
import type { Task } from '@/shared/types/domain';

/**
 * taskKeys are the cache keys for the signed-in user's tasks.
 */
export const taskKeys = {
	all: (workspaceID: string): QueryKey => workspaceKey(workspaceID, 'my-work', 'tasks'),
	mine: (workspaceID: string, includeArchived: boolean): QueryKey => [...taskKeys.all(workspaceID), 'mine', includeArchived],
};

/**
 * useMyTasks loads the signed-in user's tasks.
 */
export function useMyTasks(includeArchived: boolean) {
	const workspaceID = useWorkspaceID();

	return useQuery({
		queryKey: taskKeys.mine(workspaceID, includeArchived),
		queryFn: async () => (await listMyTasks(workspaceID, includeArchived)).tasks,
		staleTime: 30_000,
	});
}

/**
 * normalizeTitle creates a comparison key so "Fix  Bug" and "fix bug" are the same task.
 */
export function normalizeTitle(value: string): string {
	return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * TaskIndex finds existing tasks by title, for suggestions while typing a standup item.
 */
export type TaskIndex = {
	/** Up to `limit` active tasks whose title contains the query. */
	readonly search: (query: string, limit?: number) => readonly Task[];
	/** Whether the text is exactly an existing task's title. */
	readonly hasExact: (text: string) => boolean;
};

/**
 * buildTaskIndex prepares task titles once so each keystroke is a cheap scan.
 */
export function buildTaskIndex(tasks: readonly Task[]): TaskIndex {
	const entries = tasks
		.filter(task => task.status !== 'archived')
		.map(task => ({ task, key: normalizeTitle(task.title) }))
		.filter(entry => entry.key !== '');
	const exact = new Set(entries.map(entry => entry.key));

	return {
		hasExact: text => exact.has(normalizeTitle(text)),
		search: (query, limit = 6) => {
			const key = normalizeTitle(query);
			if (key.length < 2) {
				return [];
			}

			return entries
				.filter(entry => entry.key.includes(key))
				.slice(0, limit)
				.map(entry => entry.task);
		},
	};
}

/**
 * TASK_STATUSES lists every task lifecycle state in the order they are offered.
 */
export const TASK_STATUSES: readonly Task['status'][] = ['active', 'blocked', 'completed', 'dropped', 'archived'];

/**
 * taskCanReceiveTime reports whether time can still be logged against a task.
 */
export function taskCanReceiveTime(task: Task): boolean {
	return task.status !== 'archived' && task.status !== 'dropped';
}

/**
 * taskStatusKey maps a task status to its translated label.
 */
export function taskStatusKey(status: Task['status']): TranslationKey {
	return `myDay.time.task.status.${status}`;
}

/**
 * taskStatusTone picks a tag colour for a task status.
 */
export function taskStatusTone(status: Task['status']): 'teal' | 'rose' | 'blue' | 'neutral' {
	switch (status) {
		case 'active':
			return 'teal';
		case 'blocked':
			return 'rose';
		case 'completed':
			return 'blue';
		default:
			return 'neutral';
	}
}

/**
 * useTaskMutations returns the create and change-status mutations, which refresh every task and
 * time list afterwards. Removing a task archives it so its logged time and history stay intact.
 */
export function useTaskMutations() {
	const workspaceID = useWorkspaceID();
	const queryClient = useQueryClient();
	const refresh = (): Promise<void> => queryClient.invalidateQueries({ queryKey: workspaceKey(workspaceID, 'my-work') });

	const create = useMutation({
		mutationFn: (request: CreateTaskRequest) => createTask(workspaceID, request),
		onSuccess: refresh,
	});

	const changeStatus = useMutation({
		mutationFn: (input: { readonly task: Task; readonly status: Task['status'] }) =>
			updateTask(workspaceID, input.task.id, {
				title: input.task.title,
				description: input.task.description,
				status: input.status,
				projectId: input.task.projectId,
				categoryId: input.task.categoryId,
				boardUrl: input.task.boardUrl,
			}),
		onSuccess: refresh,
	});

	return { create, changeStatus };
}
