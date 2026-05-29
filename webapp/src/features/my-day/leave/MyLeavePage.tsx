import type { ReactElement } from 'react';
import { CalendarCheck2, Hourglass, Umbrella } from 'lucide-react';

import { CampfireEmpty, CampfireStatCard, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';
import type { Workspace } from '@/types/domain';

import { MyActiveLeavePanel } from './MyActiveLeavePanel';
import { MyLeaveFeedback, MyLeaveLoading, MyLeaveWarnings } from './MyLeaveFeedback';
import { MyLeaveRequestPanel } from './MyLeaveRequestPanel';
import { useMyLeave } from './useMyLeave';

/**
 * MyLeavePageProps contains workspace context and leave refresh callbacks.
 */
type MyLeavePageProps = {
	readonly workspace: Workspace;
	readonly onLeaveCreated: () => void;
	readonly onLeaveCancelled: () => void;
};

/**
 * MyLeavePage renders the personal leave workflow as one focused page.
 */
export function MyLeavePage(props: MyLeavePageProps): ReactElement {
	const leave = useMyLeave({
		workspace: props.workspace,
		onLeaveCreated: props.onLeaveCreated,
		onLeaveCancelled: props.onLeaveCancelled,
	});

	return (
		<div className="campfire-page-stack">
			<div className="campfire-stat-grid campfire-stat-grid--three">
				<CampfireStatCard
					icon={Umbrella}
					label="Active leave"
					value={String(leave.activeLeaveCount)}
					helper="Pending and approved"
				/>
				<CampfireStatCard
					icon={Hourglass}
					label="Pending"
					value={String(leave.pendingLeaveCount)}
					helper="Awaiting approval"
				/>
				<CampfireStatCard
					icon={CalendarCheck2}
					label="Approved"
					value={String(leave.approvedLeaveCount)}
					helper="Ready on calendar"
					tone="green"
				/>
			</div>

			<CampfireSurface className="campfire-control-surface">
				<header className="campfire-flat-section-header">
					<div>
						<p className="campfire-page-eyebrow">My leave</p>
						<h3 className="campfire-surface-title">Request and manage leave</h3>
						<p className="campfire-surface-description">
							Create a leave request and keep active requests visible without opening extra nested panels.
						</p>
					</div>
				</header>

				<MyLeaveFeedback state={leave.loadState} message={leave.message} />
				{leave.loadState === 'loading' && <MyLeaveLoading />}
			</CampfireSurface>

			{leave.loadState !== 'loading' && leave.leaveTypes.length === 0 && (
				<CampfireEmpty
					title="No leave types"
					description="A Lead needs to configure leave types before members can request leave."
				/>
			)}

			{leave.loadState !== 'loading' && leave.leaveTypes.length > 0 && (
				<>
					<MyLeaveWarnings warnings={leave.warnings} />

					<div className="campfire-focused-split campfire-focused-split--leave">
						<MyLeaveRequestPanel
							draft={leave.draft}
							leaveTypes={leave.leaveTypes}
							disabled={leave.isBusy}
							timezone={props.workspace.timezone}
							onChange={leave.updateDraft}
							onSubmit={leave.submitLeaveRequest}
						/>

						<MyActiveLeavePanel
							leaveRequests={leave.myActiveLeaves}
							disabled={leave.isBusy}
							onCancel={leave.cancelMyLeaveRequest}
						/>
					</div>
				</>
			)}
		</div>
	);
}
