import { useState } from 'react';
import type { ReactElement } from 'react';

import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { resolveMyDaySection } from './my-day.helpers';
import { MyDayHero } from './MyDayHero';
import { MyDaySectionNavigation } from './MyDaySectionNavigation';
import { MyDaySectionPanel } from './MyDaySectionPanel';
import type { MyDaySectionID } from './my-day.types';

/**
 * MyDayPage renders the current user's focused daily workflow.
 */
export function MyDayPage(props: WorkspaceShellProps): ReactElement {
	const [activeSectionID, setActiveSectionID] = useState<MyDaySectionID>('check-in');
	const activeSection = resolveMyDaySection(activeSectionID);

	return (
		<div className="cf:grid cf:gap-6">
			<MyDayHero activeSection={activeSection} workspaceName={props.workspace.name} />

			<MyDaySectionNavigation activeSectionID={activeSection.id} onSelectSection={setActiveSectionID} />

			<MyDaySectionPanel activeSectionID={activeSection.id} {...props} />
		</div>
	);
}
