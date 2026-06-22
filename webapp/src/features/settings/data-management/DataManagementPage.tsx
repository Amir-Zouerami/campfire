import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { AlertTriangle, DatabaseZap, ShieldAlert } from 'lucide-react';

import { CampfireBidiText } from '@/components/campfire/CampfireBidiText';
import { CampfireConfirmDialog } from '@/components/campfire/CampfireConfirmDialog';
import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireFeedback } from '@/components/campfire/CampfireFeedback';
import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireInlineLoading } from '@/components/campfire/CampfireLoading';
import { CampfireNotice } from '@/components/campfire/CampfireNotice';
import { CampfirePageIntro } from '@/components/campfire/CampfirePageIntro';
import { CampfireSection } from '@/components/campfire/CampfireSection';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';
import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { formatRetentionCount, localizedDataRetentionMetrics } from './data-management.helpers';
import { useDataManagement } from './useDataManagement';

/**
 * DataManagementPage renders irreversible workspace data cleanup controls.
 */
export function DataManagementPage(props: WorkspaceShellProps): ReactElement {
	const { htmlLang, t } = useI18n();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const dataManagement = useDataManagement({
		workspace: props.workspace,
		canManageWorkspace: props.canManageWorkspace,
		onDataPurged: props.onRefresh,
	});
	const summary = dataManagement.summary;
	const metrics = useMemo(() => localizedDataRetentionMetrics(t), [t]);
	const totalRowsLabel = formatRetentionCount(summary?.totalRows ?? 0, htmlLang);
	const cutoffDate = summary?.cutoffDate ?? dataManagement.previewCutoffDate;

	return (
		<div className="campfire-page-stack campfire-settings-workflow campfire-data-management-page">
			<CampfirePageIntro
				eyebrow={t('settings.dataManagement.page.eyebrow')}
				title={t('settings.dataManagement.page.title')}
				description={t('settings.dataManagement.page.description')}
			/>

			<CampfireNotice
				icon={ShieldAlert}
				title={t('settings.dataManagement.guardrail.title')}
				description={t('settings.dataManagement.guardrail.description')}
			/>

			<CampfireSection
				eyebrow={t('settings.dataManagement.preview.eyebrow')}
				title={t('settings.dataManagement.preview.title')}
				description={t('settings.dataManagement.preview.description')}
				icon={DatabaseZap}
				actions={
					<Button type="button" disabled={dataManagement.isPreviewLoading} onClick={dataManagement.preview}>
						{dataManagement.isPreviewLoading ? <CampfireInlineLoading label={t('settings.dataManagement.preview.loading')} /> : t('settings.dataManagement.preview.action')}
					</Button>
				}
			>
				<div className="cf:grid cf:gap-5">
					<CampfireField
						id="campfire-data-retention-cutoff"
						label={t('settings.dataManagement.cutoff.label')}
						description={t('settings.dataManagement.cutoff.description')}
					>
						<CampfireDateInput
							id="campfire-data-retention-cutoff"
							value={dataManagement.cutoffDate}
							timezone={props.workspace.timezone}
								workingDays={props.workspace.workingDays}
							disabled={dataManagement.isPreviewLoading || dataManagement.isPurgeBusy}
							onValueChange={dataManagement.setCutoffDate}
						/>
					</CampfireField>

					<CampfireFeedback
						message={dataManagement.message}
						tone={dataManagement.messageTone}
						showInlineError
					/>
				</div>
			</CampfireSection>

			{summary !== undefined && (
				<CampfireSection
					eyebrow={t('settings.dataManagement.summary.eyebrow')}
					title={t('settings.dataManagement.summary.title', { count: totalRowsLabel })}
					description={t('settings.dataManagement.summary.description', { cutoffDate })}
					actions={
						<Button
							type="button"
							variant="destructive"
							disabled={!dataManagement.canPurge}
							onClick={() => setConfirmOpen(true)}
						>
							{t('settings.dataManagement.summary.action')}
						</Button>
					}
				>
					<div className="cf:grid cf:grid-cols-1 cf:gap-3 lg:cf:grid-cols-2">
						{metrics.map(metric => (
							<div key={metric.key} className="campfire-retention-metric-card">
								<strong>{formatRetentionCount(summary[metric.key], htmlLang)}</strong>
								<span>{metric.label}</span>
								<p>{metric.description}</p>
							</div>
						))}
					</div>
				</CampfireSection>
			)}

			<CampfireConfirmDialog
				open={confirmOpen}
				intent="danger"
				title={t('settings.dataManagement.confirm.title')}
				description={t('settings.dataManagement.confirm.description')}
				confirmLabel={t('settings.dataManagement.confirm.action')}
				busy={dataManagement.isPurgeBusy}
				onCancel={() => setConfirmOpen(false)}
				onConfirm={() => {
					void dataManagement.purge().then(() => setConfirmOpen(false));
				}}
			>
				<div className="campfire-destructive-confirmation-copy">
					<AlertTriangle className="cf:size-5" />
					<p>
						<CampfireBidiText>{t('settings.dataManagement.confirm.body', {
							count: totalRowsLabel,
							cutoffDate,
						})}</CampfireBidiText>
					</p>
				</div>
			</CampfireConfirmDialog>
		</div>
	);
}
