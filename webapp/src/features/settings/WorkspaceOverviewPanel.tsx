import type { ReactElement } from 'react';
import { FileCog } from 'lucide-react';

import { CampfireCardBody, CampfireCardHeader, CampfireMetric, CampfirePanel } from '@/app/campfire-ui';

import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

/**
 * WorkspaceOverviewPanel renders static workspace identity and context.
 */
export function WorkspaceOverviewPanel(props: WorkspaceShellProps): ReactElement {
	return (
		<CampfirePanel>
			<CampfireCardHeader
				eyebrow="Workspace"
				title={props.workspace.name}
				description="This overview stays intentionally lightweight. Detailed controls live in the focused settings pages."
				icon={FileCog}
			/>

			<CampfireCardBody className="campfire-context-grid">
				<CampfireMetric label="Channel ID" value={props.workspace.channelId} helper="Mattermost channel" />
				<CampfireMetric label="Team ID" value={props.workspace.teamId} helper="Mattermost team" />
				<CampfireMetric label="Timezone" value={props.workspace.timezone} helper="Schedule calculations" />
				<CampfireMetric
					label="Board URL"
					value={props.workspace.boardUrl.trim() === '' ? 'Not set' : props.workspace.boardUrl}
					helper="External link only"
				/>
				<CampfireMetric label="Created by" value={props.workspace.createdBy} helper="Mattermost user ID" />
				<CampfireMetric
					label="Status"
					value={props.workspace.isArchived ? 'Archived' : 'Active'}
					helper="Workspace state"
				/>
			</CampfireCardBody>
		</CampfirePanel>
	);
}
