import { ApiClientError } from '@/api';
import type { Task, TaskStatus } from '@/types/domain';

import type { TaskDraft, TimeEntryDraft } from './my-time.types';

/**
 * taskStatusOptions lists supported task lifecycle statuses.
 */
export const taskStatusOptions: readonly TaskStatus[] = ['active', 'blocked', 'completed', 'dropped', 'archived'];

/**
 * emptyTaskDraft returns the default create-task form state.
 */
export function emptyTaskDraft(): TaskDraft {
	return {
		title: '',
		description: '',
		projectId: '',
		categoryId: '',
		boardUrl: '',
	};
}

/**
 * emptyTimeEntryDraft returns the default log-time form state.
 */
export function emptyTimeEntryDraft(): TimeEntryDraft {
	return {
		taskId: '',
		entryDate: getTodayLocalDateString(),
		minutes: '30',
		note: '',
		projectId: '',
		categoryId: '',
	};
}

/**
 * getTodayLocalDateString returns today's local date as YYYY-MM-DD.
 */
export function getTodayLocalDateString(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

/**
 * addDaysToLocalDate returns a YYYY-MM-DD date offset from another local date.
 */
export function addDaysToLocalDate(value: string, days: number): string {
	const [yearRaw, monthRaw, dayRaw] = value.split('-');
	const year = Number.parseInt(yearRaw ?? '', 10);
	const month = Number.parseInt(monthRaw ?? '', 10);
	const day = Number.parseInt(dayRaw ?? '', 10);

	if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
		return value;
	}

	const date = new Date(year, month - 1, day);
	date.setDate(date.getDate() + days);

	const nextYear = date.getFullYear();
	const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
	const nextDay = String(date.getDate()).padStart(2, '0');

	return `${nextYear}-${nextMonth}-${nextDay}`;
}

/**
 * taskCanReceiveTime returns whether a task should be offered in the log-time picker.
 */
export function taskCanReceiveTime(task: Task): boolean {
	return task.status !== 'archived' && task.status !== 'dropped';
}

/**
 * activeTaskCount returns the number of in-progress tasks.
 */
export function activeTaskCount(tasks: readonly Task[]): number {
	return tasks.filter(task => task.status === 'active' || task.status === 'blocked').length;
}

/**
 * taskMapByID creates a lookup table for task labels.
 */
export function taskMapByID(tasks: readonly Task[]): Readonly<Record<string, Task>> {
	const result: Record<string, Task> = {};

	for (const task of tasks) {
		result[task.id] = task;
	}

	return result;
}

/**
 * taskLabelForID returns a readable task label.
 */
export function taskLabelForID(tasksByID: Readonly<Record<string, Task>>, taskID: string): string {
	return tasksByID[taskID]?.title ?? 'Unknown task';
}

/**
 * parseMinutes returns a valid positive minute value.
 */
export function parseMinutes(value: string): number | null {
	const parsed = Number.parseInt(value, 10);

	if (!Number.isFinite(parsed) || parsed <= 0) {
		return null;
	}

	return parsed;
}

/**
 * formatMinutes formats minutes as a compact duration.
 */
export function formatMinutes(minutes: number): string {
	if (minutes < 60) {
		return `${minutes}m`;
	}

	const hours = Math.floor(minutes / 60);
	const remainder = minutes % 60;

	if (remainder === 0) {
		return `${hours}h`;
	}

	return `${hours}h ${remainder}m`;
}

/**
 * formatTaskStatus returns a readable task status label.
 */
export function formatTaskStatus(status: TaskStatus): string {
	return status
		.split('_')
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

/**
 * statusTone returns a Campfire status tone for a task status.
 */
export function statusTone(status: TaskStatus): 'green' | 'ember' | 'red' | 'slate' {
	switch (status) {
		case 'active':
			return 'green';

		case 'blocked':
			return 'red';

		case 'completed':
			return 'ember';

		case 'dropped':
		case 'archived':
			return 'slate';
	}
}

/**
 * errorToMessage converts unknown thrown values into a safe UI message.
 */
export function errorToMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return 'Could not update tasks and time.';
}
