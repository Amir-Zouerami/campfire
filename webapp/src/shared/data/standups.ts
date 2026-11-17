import { useQuery } from '@tanstack/react-query';

import { listStandupConfiguration } from '@/shared/api';
import type { TFunction } from '@/shared/i18n';
import type { ListStandupConfigurationResponse } from '@/shared/types/api';
import type { QueryKey } from '@/shared/query/keys';
import { workspaceKey } from '@/shared/query/keys';
import { useWorkspaceID } from '@/shared/session';

/**
 * standupKeys are the cache keys for everything standup-related in one workspace.
 * Invalidating `standupKeys.all` refreshes configuration, runtime decisions and submissions.
 */
export const standupKeys = {
	all: (workspaceID: string): QueryKey => workspaceKey(workspaceID, 'standups'),
	configuration: (workspaceID: string): QueryKey => [...standupKeys.all(workspaceID), 'configuration'],
	runtime: (workspaceID: string, date: string): QueryKey => [...standupKeys.all(workspaceID), 'runtime', date],
	mine: (workspaceID: string, ...parts: readonly unknown[]): QueryKey => [...standupKeys.all(workspaceID), 'mine', ...parts],
	submissions: (workspaceID: string, ...parts: readonly unknown[]): QueryKey => [...standupKeys.all(workspaceID), 'submissions', ...parts],
};

/**
 * useStandupConfiguration loads the workspace's standup templates, questions and schedules.
 * It is shared by My Day (filling the form), Team Review (reading answers) and Settings (editing).
 * Settings pass `includeInactive` so deactivated templates stay visible and can be re-activated;
 * everywhere else only active templates are relevant.
 */
export function useStandupConfiguration(options: { readonly includeInactive?: boolean } = {}) {
	const workspaceID = useWorkspaceID();
	const includeInactive = options.includeInactive === true;

	return useQuery({
		queryKey: [...standupKeys.configuration(workspaceID), { includeInactive }],
		queryFn: () => listStandupConfiguration(workspaceID, { includeInactive }),
		staleTime: 60_000,
	});
}

/**
 * scheduleKindLabel translates a schedule kind, leaving unknown future kinds readable.
 */
export function scheduleKindLabel(t: TFunction, kind: string): string {
	switch (kind) {
		case 'daily':
			return t('myDay.standup.kind.daily');
		case 'weekly':
			return t('myDay.standup.kind.weekly');
		default:
			return t('myDay.standup.kind.generic', { kind });
	}
}

/**
 * ScheduleInfo is what settings pages need to talk about a schedule: its template's name,
 * its kind and its window. `known` is false for rules pointing at a schedule that no longer exists.
 */
export type ScheduleInfo = {
	readonly known: boolean;
	readonly templateName: string;
	readonly kind: string;
	readonly opensAt: string;
	readonly closesAt: string;
};

/**
 * scheduleInfoFor looks a schedule up in a loaded standup configuration.
 */
export function scheduleInfoFor(configuration: ListStandupConfigurationResponse, scheduleID: string): ScheduleInfo {
	const schedule = configuration.schedules.find(candidate => candidate.id === scheduleID);
	if (schedule === undefined) {
		return { known: false, templateName: '', kind: '', opensAt: '09:30', closesAt: '10:00' };
	}

	const template = configuration.templates.find(candidate => candidate.id === schedule.templateId);

	return {
		known: true,
		templateName: template?.name.trim() ?? '',
		kind: schedule.kind,
		opensAt: schedule.opensAt,
		closesAt: schedule.timeOfDay,
	};
}
