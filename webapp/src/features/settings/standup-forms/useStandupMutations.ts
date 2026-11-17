import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
	createStandupQuestion,
	createStandupSchedule,
	createStandupTemplate,
	deleteStandupQuestion,
	deleteStandupSchedule,
	deleteStandupTemplate,
	updateStandupQuestion,
	updateStandupSchedule,
	updateStandupTemplate,
} from '@/shared/api';
import { standupKeys } from '@/shared/data/standups';
import { useI18n } from '@/shared/i18n';
import { workspaceKey } from '@/shared/query/keys';
import { useWorkspaceID } from '@/shared/session';
import type {
	CreateStandupQuestionRequest,
	CreateStandupScheduleRequest,
	CreateStandupTemplateRequest,
	UpdateStandupTemplateRequest,
} from '@/shared/types/api';
import { toast } from '@/shared/ui';

/**
 * useStandupMutations are the create, update and delete actions for templates, questions and
 * schedules. After any change the standup configuration is refetched everywhere (My Day shows
 * the new form straight away), and reminder and report rules are refetched too, because the
 * server creates and removes them together with schedules.
 */
export function useStandupMutations() {
	const { t } = useI18n();
	const workspaceID = useWorkspaceID();
	const queryClient = useQueryClient();

	const changed = (message: Parameters<typeof t>[0]) => async (): Promise<void> => {
		toast.success(t(message));
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: standupKeys.all(workspaceID) }),
			queryClient.invalidateQueries({ queryKey: workspaceKey(workspaceID, 'settings') }),
		]);
	};

	return {
		createTemplate: useMutation({
			mutationFn: (request: CreateStandupTemplateRequest) => createStandupTemplate(workspaceID, request),
			onSuccess: changed('settings.standups.toast.templateCreated'),
		}),
		updateTemplate: useMutation({
			mutationFn: (input: { readonly id: string; readonly request: UpdateStandupTemplateRequest }) =>
				updateStandupTemplate(workspaceID, input.id, input.request),
			onSuccess: changed('settings.standups.toast.templateUpdated'),
		}),
		deleteTemplate: useMutation({
			mutationFn: (id: string) => deleteStandupTemplate(workspaceID, id),
			onSuccess: changed('settings.standups.toast.templateDeleted'),
		}),
		createQuestion: useMutation({
			mutationFn: (request: CreateStandupQuestionRequest) => createStandupQuestion(workspaceID, request),
			onSuccess: changed('settings.standups.toast.questionCreated'),
		}),
		updateQuestion: useMutation({
			mutationFn: (input: { readonly id: string; readonly request: CreateStandupQuestionRequest }) =>
				updateStandupQuestion(workspaceID, input.id, input.request),
			onSuccess: changed('settings.standups.toast.questionUpdated'),
		}),
		deleteQuestion: useMutation({
			mutationFn: (id: string) => deleteStandupQuestion(workspaceID, id),
			onSuccess: changed('settings.standups.toast.questionDeleted'),
		}),
		createSchedule: useMutation({
			mutationFn: (request: CreateStandupScheduleRequest) => createStandupSchedule(workspaceID, request),
			onSuccess: changed('settings.standups.toast.scheduleCreated'),
		}),
		updateSchedule: useMutation({
			mutationFn: (input: { readonly id: string; readonly request: CreateStandupScheduleRequest }) =>
				updateStandupSchedule(workspaceID, input.id, input.request),
			onSuccess: changed('settings.standups.toast.scheduleUpdated'),
		}),
		deleteSchedule: useMutation({
			mutationFn: (id: string) => deleteStandupSchedule(workspaceID, id),
			onSuccess: changed('settings.standups.toast.scheduleDeleted'),
		}),
	};
}
