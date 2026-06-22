import type { ReactElement } from 'react';

import { CampfirePageIntro } from '@/components/campfire/CampfirePageIntro';
import { useI18n } from '@/i18n';

import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { GlobalOffDayCreatePanel } from './GlobalOffDayCreatePanel';
import { GlobalOffDaysFeedback, GlobalOffDaysLoading } from './GlobalOffDaysFeedback';
import { GlobalOffDaysListPanel } from './GlobalOffDaysListPanel';
import { useGlobalOffDays } from './useGlobalOffDays';

/**
 * GlobalOffDaysPage renders global Campfire off-day settings.
 */
export function GlobalOffDaysPage(props: WorkspaceShellProps): ReactElement {
	const { t } = useI18n();
	const offDays = useGlobalOffDays({
		isSystemAdmin: props.isSystemAdmin,
	});

	return (
		<div className="campfire-page-stack campfire-settings-workflow campfire-settings-workflow--minimal">
			<CampfirePageIntro
				eyebrow={t('settings.globalOffDays.page.eyebrow')}
				title={t('settings.globalOffDays.page.title')}
				description={t('settings.globalOffDays.page.description')}
			/>

			<GlobalOffDaysFeedback state={offDays.loadState} message={offDays.message} />

			{!props.isSystemAdmin && (
				<GlobalOffDaysFeedback
					state="error"
					message={t('settings.globalOffDays.permission.viewOnly')}
				/>
			)}

			{offDays.loadState === 'loading' && <GlobalOffDaysLoading />}

			{offDays.loadState !== 'loading' && (
				<div className="campfire-settings-split campfire-settings-split--calendar campfire-settings-split--flat">
					<GlobalOffDayCreatePanel
						draft={offDays.draft}
						disabled={offDays.isBusy}
						isSystemAdmin={props.isSystemAdmin}
						onChange={offDays.updateDraft}
						onCreate={offDays.createOffDay}
					/>

					<GlobalOffDaysListPanel
						skipDates={offDays.sortedSkipDates}
						disabled={offDays.isBusy}
						isSystemAdmin={props.isSystemAdmin}
						deletingID={offDays.deletingID}
						onDelete={offDays.deleteOffDay}
					/>
				</div>
			)}
		</div>
	);
}
