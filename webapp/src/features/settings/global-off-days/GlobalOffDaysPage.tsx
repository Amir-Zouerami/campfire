import type { ReactElement } from 'react';

import { CampfireCardBody, CampfirePanel } from '@/app/campfire-ui';

import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

import { GlobalOffDayCreatePanel } from './GlobalOffDayCreatePanel';
import { GlobalOffDaysFeedback, GlobalOffDaysLoading } from './GlobalOffDaysFeedback';
import { GlobalOffDaysHero } from './GlobalOffDaysHero';
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
		<div className="cf:grid cf:gap-5">
			<GlobalOffDaysHero
				skipDateCount={offDays.skipDates.length}
				upcomingCount={offDays.upcomingCount}
				isSystemAdmin={props.isSystemAdmin}
			/>

			<CampfirePanel>
				<CampfireCardBody className="cf:grid cf:gap-5">
					<GlobalOffDaysFeedback state={offDays.loadState} message={offDays.message} />

					{!props.isSystemAdmin && (
						<GlobalOffDaysFeedback
							state="error"
							message="You can view global off-days, but only system admins can edit them."
						/>
					)}

					{offDays.loadState === 'loading' && <GlobalOffDaysLoading />}

					{offDays.loadState !== 'loading' && (
						<div className="cf:grid cf:gap-5 cf:xl:grid-cols-[0.9fr_1.1fr]">
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
				</CampfireCardBody>
			</CampfirePanel>
		</div>
	);
}
