import type { TaskStatus } from '@/types/domain';

/**
 * MyTimeLoadState describes the tasks/time page data state.
 */
export type MyTimeLoadState = 'idle' | 'loading' | 'ready' | 'saving' | 'error';

/**
 * TaskDraft stores the create-task form state.
 */
export type TaskDraft = {
	readonly title: string;
	readonly description: string;
	readonly projectId: string;
	readonly categoryId: string;
	readonly boardUrl: string;
};

/**
 * TimeEntryDraft stores the log-time form state.
 */
export type TimeEntryDraft = {
	readonly taskId: string;
	readonly entryDate: string;
	readonly minutes: string;
	readonly note: string;
	readonly projectId: string;
	readonly categoryId: string;
};


/**
 * TaskDraftValidationErrors stores local validation messages for the create-task form.
 */
export type TaskDraftValidationErrors = {
	readonly title?: string;
};

/**
 * TimeEntryDraftValidationErrors stores local validation messages for the time-entry form.
 */
export type TimeEntryDraftValidationErrors = {
	readonly taskId?: string;
	readonly minutes?: string;
};

/**
 * TaskDraftPatch updates part of the create-task form.
 */
export type TaskDraftPatch = Partial<TaskDraft>;

/**
 * TimeEntryDraftPatch updates part of the log-time form.
 */
export type TimeEntryDraftPatch = Partial<TimeEntryDraft>;

/**
 * TaskStatusChangeHandler updates a task status.
 */
export type TaskStatusChangeHandler = (taskId: string, status: TaskStatus) => void;