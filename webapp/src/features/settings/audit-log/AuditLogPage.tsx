import type { ReactElement } from 'react';

import { useUserProfiles } from '@/app/useUserProfiles';
import { CampfirePageIntro } from '@/components/campfire/CampfirePageIntro';
import { useI18n } from '@/i18n';

import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { AuditLogControls } from './AuditLogControls';
import { AuditLogEntriesPanel } from './AuditLogEntriesPanel';
import { AuditLogFeedback, AuditLogLoading } from './AuditLogFeedback';
import { useAuditLog } from './useAuditLog';

/**
 * AuditLogPage renders workspace audit history.
 */
export function AuditLogPage(props: WorkspaceShellProps): ReactElement {
	const { t } = useI18n();
	const audit = useAuditLog({
		workspace: props.workspace,
	});

	const profiles = useUserProfiles(audit.actorUserIDs);

	return (
		<div className="campfire-page-stack campfire-settings-workflow campfire-settings-workflow--minimal campfire-audit-page">
			<CampfirePageIntro
				eyebrow={t('settings.audit.page.eyebrow')}
				title={t('settings.audit.page.title')}
				description={t('settings.audit.page.description')}
				actions={
					<AuditLogControls
						limit={audit.limit}
						disabled={audit.isBusy}
						onLimitChange={audit.setLimit}
						onReload={audit.reload}
					/>
				}
			/>

			<AuditLogFeedback
				state={audit.loadState}
				message={audit.message}
				profileErrorMessage={profiles.errorMessage}
			/>

			{audit.loadState === 'loading' && <AuditLogLoading />}

			{audit.loadState !== 'loading' && (
				<AuditLogEntriesPanel entries={audit.entries} labelForUserID={profiles.labelForUserID} />
			)}
		</div>
	);
}
