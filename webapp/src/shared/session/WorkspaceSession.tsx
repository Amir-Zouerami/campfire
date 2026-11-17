import { createContext, use } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { todayIn, weekStartFor } from '@/shared/lib/date';
import type { IsoDate } from '@/shared/lib/date';
import type { MeUserResponse } from '@/shared/types/api';
import type { Workspace, WorkspaceCapabilities } from '@/shared/types/domain';

/**
 * WorkspaceSession is the signed-in user's view of the workspace Campfire is showing.
 * It is set once at the app boundary; features read it instead of receiving props.
 */
export type WorkspaceSession = {
	readonly workspace: Workspace;
	readonly capabilities: WorkspaceCapabilities;
	readonly user: MeUserResponse;
	readonly isSystemAdmin: boolean;
};

const WorkspaceSessionContext = createContext<WorkspaceSession | null>(null);

/**
 * WorkspaceSessionProvider publishes the session to the page tree.
 */
export function WorkspaceSessionProvider(props: { readonly value: WorkspaceSession; readonly children: ReactNode }): ReactElement {
	return <WorkspaceSessionContext value={props.value}>{props.children}</WorkspaceSessionContext>;
}

/**
 * useWorkspaceSession returns the current session. Pages are only rendered inside a ready
 * workspace, so a missing session is a programming error.
 */
export function useWorkspaceSession(): WorkspaceSession {
	const session = use(WorkspaceSessionContext);
	if (session === null) {
		throw new Error('useWorkspaceSession must be used inside a WorkspaceSessionProvider.');
	}

	return session;
}

/**
 * useWorkspaceID returns the current workspace's ID.
 */
export function useWorkspaceID(): string {
	return useWorkspaceSession().workspace.id;
}

/**
 * useToday returns today's date in the workspace timezone (not the browser's), matching how
 * the backend decides which day a standup, leave or time entry belongs to.
 */
export function useToday(): IsoDate {
	return todayIn(useWorkspaceSession().workspace.timezone);
}

/**
 * useWeekStart returns the first weekday of the workspace's week.
 */
export function useWeekStart(): number {
	return weekStartFor(useWorkspaceSession().workspace.timezone);
}
