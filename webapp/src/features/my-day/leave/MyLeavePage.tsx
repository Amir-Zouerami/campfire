import type { ReactElement } from 'react';

import { CampfireCardBody, CampfireEmpty, CampfirePanel } from '@/app/campfire-ui';
import type { Workspace } from '@/types/domain';

import { MyActiveLeavePanel } from './MyActiveLeavePanel';
import { MyLeaveFeedback, MyLeaveLoading, MyLeaveWarnings } from './MyLeaveFeedback';
import { MyLeaveHero } from './MyLeaveHero';
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
 * MyLeavePage renders the rewritten personal leave workflow.
 */
export function MyLeavePage(props: MyLeavePageProps): ReactElement {
	const leave = useMyLeave({
		workspace: props.workspace,
		onLeaveCreated: props.onLeaveCreated,
		onLeaveCancelled: props.onLeaveCancelled,
	});

	return (
		<div className="cf:grid cf:gap-5">
			<MyLeaveHero
				activeLeaveCount={leave.activeLeaveCount}
				pendingLeaveCount={leave.pendingLeaveCount}
				approvedLeaveCount={leave.approvedLeaveCount}
			/>

			<CampfirePanel>
				<CampfireCardBody className="cf:grid cf:gap-5">
					<MyLeaveFeedback state={leave.loadState} message={leave.message} />

					{leave.loadState === 'loading' && <MyLeaveLoading />}

					{leave.loadState !== 'loading' && leave.leaveTypes.length === 0 && (
						<CampfireEmpty
							title="No leave types"
							description="A Lead needs to configure leave types before members can request leave."
						/>
					)}

					{leave.loadState !== 'loading' && leave.leaveTypes.length > 0 && (
						<>
							<MyLeaveWarnings warnings={leave.warnings} />

							<div className="cf:grid cf:gap-5 cf:xl:grid-cols-[0.95fr_1.05fr]">
								<MyLeaveRequestPanel
									draft={leave.draft}
									leaveTypes={leave.leaveTypes}
									disabled={leave.isBusy}
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
				</CampfireCardBody>
			</CampfirePanel>
		</div>
	);
}
