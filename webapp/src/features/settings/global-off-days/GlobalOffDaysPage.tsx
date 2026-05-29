import type { ReactElement } from 'react';
import { CalendarOff, Globe2, ShieldCheck } from 'lucide-react';

import { CampfireStatCard, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';

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
		<div className="campfire-page-stack campfire-settings-workflow">
			<div className="campfire-stat-grid campfire-stat-grid--three">
				<CampfireStatCard icon={Globe2} label="Global off-days" value={String(offDays.skipDates.length)} helper="All workspaces" />
				<CampfireStatCard icon={CalendarOff} label="Upcoming" value={String(offDays.upcomingCount)} helper="Future dates" />
				<CampfireStatCard
					icon={ShieldCheck}
					label="Access"
					value={props.isSystemAdmin ? 'Editable' : 'Read only'}
					helper="System admin only"
					tone={props.isSystemAdmin ? 'green' : 'slate'}
				/>
			</div>

			<CampfireSurface className="campfire-control-surface campfire-settings-control-surface">
				<header className="campfire-flat-section-header">
					<div>
						<p className="campfire-page-eyebrow">Global off-days</p>
						<h3 className="campfire-surface-title">Organization-wide skip dates</h3>
						<p className="campfire-surface-description">
							Manage holidays and no-standup dates that apply across all Campfire workspaces.
						</p>
					</div>
					<Globe2 className="campfire-flat-header-icon" aria-hidden="true" />
				</header>

				<GlobalOffDaysFeedback state={offDays.loadState} message={offDays.message} />

				{!props.isSystemAdmin && (
					<GlobalOffDaysFeedback
						state="error"
						message="You can view global off-days, but only system admins can edit them."
					/>
				)}

				{offDays.loadState === 'loading' && <GlobalOffDaysLoading />}
			</CampfireSurface>

			{offDays.loadState !== 'loading' && (
				<div className="campfire-settings-split campfire-settings-split--calendar">
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
