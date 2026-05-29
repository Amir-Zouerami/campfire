import type { ReactElement } from 'react';
import { Activity, ListFilter, RefreshCw, UsersRound } from 'lucide-react';

import { useUserProfiles } from '@/app/useUserProfiles';
import { CampfireStatCard, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';

import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { AuditLogControls } from './AuditLogControls';
import { AuditLogEntriesPanel } from './AuditLogEntriesPanel';
import { AuditLogFeedback, AuditLogLoading } from './AuditLogFeedback';
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
		<div className="campfire-page-stack campfire-settings-workflow">
			<div className="campfire-stat-grid campfire-stat-grid--four">
				<CampfireStatCard icon={Activity} label="Entries" value={String(audit.entries.length)} helper="Recent actions" />
				<CampfireStatCard
					icon={UsersRound}
					label="Actors"
					value={String(audit.actorUserIDs.length)}
					helper={profiles.loading ? 'Loading profiles' : 'Resolved users'}
				/>
				<CampfireStatCard icon={ListFilter} label="Actions" value={String(audit.actionCounts.length)} helper="Action types" />
				<CampfireStatCard icon={RefreshCw} label="Limit" value={String(audit.limit)} helper="Rows loaded" />
			</div>

			<CampfireSurface className="campfire-control-surface campfire-settings-control-surface">
				<header className="campfire-flat-section-header">
					<div>
						<p className="campfire-page-eyebrow">Audit log</p>
						<h3 className="campfire-surface-title">Recent workspace activity</h3>
						<p className="campfire-surface-description">
							Review important Campfire changes with a stable control row and a single focused activity list.
						</p>
					</div>
					<Activity className="campfire-flat-header-icon" aria-hidden="true" />
				</header>

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
			</CampfireSurface>

			{audit.loadState !== 'loading' && (
				<AuditLogEntriesPanel entries={audit.entries} labelForUserID={profiles.labelForUserID} />
			)}
		</div>
	);
}
