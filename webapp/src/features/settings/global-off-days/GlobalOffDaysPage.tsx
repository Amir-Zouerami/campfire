import type { ReactElement } from 'react';

import { CampfirePageIntro } from '@/components/campfire/CampfirePageIntro';

import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { GlobalOffDayCreatePanel } from './GlobalOffDayCreatePanel';
import { GlobalOffDaysFeedback, GlobalOffDaysLoading } from './GlobalOffDaysFeedback';
import { GlobalOffDaysListPanel } from './GlobalOffDaysListPanel';
import { useGlobalOffDays } from './useGlobalOffDays';

/**
 * GlobalOffDaysPage renders global Campfire off-day settings.
 */
export function GlobalOffDaysPage(props: WorkspaceShellProps): ReactElement {
	const offDays = useGlobalOffDays({
		isSystemAdmin: props.isSystemAdmin,
	});

	return (
		<div className="campfire-page-stack campfire-settings-workflow campfire-settings-workflow--minimal">
			<CampfirePageIntro
				eyebrow="Global off-days"
				title="Organization-wide skip dates"
				description="Manage holidays and no-standup dates that apply across every Campfire workspace."
			/>

			<GlobalOffDaysFeedback state={offDays.loadState} message={offDays.message} />

			{!props.isSystemAdmin && (
				<GlobalOffDaysFeedback
					state="error"
					message="You can view global off-days, but only system admins can edit them."
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
