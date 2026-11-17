import type { ReactElement } from 'react';

import { useI18n } from '@/shared/i18n';
import { weekStartFor } from '@/shared/lib/date';
import { WorkspaceSessionProvider } from '@/shared/session';
import { UiSettingsProvider } from '@/shared/ui';
import type { UiSettings } from '@/shared/ui';
import type { Workspace, WorkspaceCapabilities } from '@/shared/types/domain';
import type { MeResponse } from '@/shared/types/api';

import { WorkspaceShell } from './WorkspaceShell';

type WorkspaceAppProps = {
	readonly workspace: Workspace;
	readonly capabilities: WorkspaceCapabilities;
	readonly me: MeResponse;
	readonly onClose: () => void;
};

/**
 * WorkspaceApp provides the workspace session to everything below it.
 */
export function WorkspaceApp(props: WorkspaceAppProps): ReactElement {
	const { language } = useI18n();

	// Jalali dates are shown beside Gregorian ones for Persian users and Tehran workspaces.
	const settings: UiSettings = {
		alternateCalendar: language === 'persian' || props.workspace.timezone === 'Asia/Tehran' ? 'persian' : null,
		weekStart: weekStartFor(props.workspace.timezone),
	};

	return (
		<WorkspaceSessionProvider
			value={{ workspace: props.workspace, capabilities: props.capabilities, user: props.me.user, isSystemAdmin: props.me.isSystemAdmin }}
		>
			<UiSettingsProvider value={settings}>
				<WorkspaceShell onClose={props.onClose} key={props.workspace.id} />
			</UiSettingsProvider>
		</WorkspaceSessionProvider>
	);
}
