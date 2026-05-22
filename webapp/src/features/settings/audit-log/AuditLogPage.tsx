import type { ReactElement } from 'react';

import { CampfireCardBody, CampfirePanel } from '@/app/campfire-ui';
import { useUserProfiles } from '@/app/useUserProfiles';

import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { AuditLogControls } from './AuditLogControls';
import { AuditLogEntriesPanel } from './AuditLogEntriesPanel';
import { AuditLogFeedback, AuditLogLoading } from './AuditLogFeedback';
import { AuditLogHero } from './AuditLogHero';
import { useAuditLog } from './useAuditLog';

/**
 * AuditLogPage renders workspace audit history.
 */
export function AuditLogPage(props: WorkspaceShellProps): ReactElement {
	const audit = useAuditLog({
		workspace: props.workspace,
	});

	const profiles = useUserProfiles(audit.actorUserIDs);

	return (
		<div className="cf:grid cf:gap-5">
			<AuditLogHero
				entryCount={audit.entries.length}
				actorCount={audit.actorUserIDs.length}
				actionCount={audit.actionCounts.length}
				profilesLoading={profiles.loading}
			/>

			<CampfirePanel>
				<CampfireCardBody className="cf:grid cf:gap-5">
					<AuditLogFeedback
						state={audit.loadState}
						message={audit.message}
						profileErrorMessage={profiles.errorMessage}
					/>

					<AuditLogControls
						limit={audit.limit}
						disabled={audit.isBusy}
						onLimitChange={audit.setLimit}
						onReload={audit.reload}
					/>

					{audit.loadState === 'loading' && <AuditLogLoading />}

					{audit.loadState !== 'loading' && (
						<AuditLogEntriesPanel entries={audit.entries} labelForUserID={profiles.labelForUserID} />
					)}
				</CampfireCardBody>
			</CampfirePanel>
		</div>
	);
}
