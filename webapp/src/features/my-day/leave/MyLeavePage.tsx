import type { ReactElement } from 'react';

import { CampfireEmpty } from '@/components/campfire/CampfireLayoutPrimitives';
import { CampfirePageIntro } from '@/components/campfire/CampfirePageIntro';
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
		<div className="campfire-page-stack campfire-my-leave-page">
			<CampfirePageIntro
				eyebrow="My leave"
				title="Request and manage leave"
				description="Create a request, review active leave, and cancel requests when allowed."
			/>

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
							timezone={props.workspace.timezone}
							onCancel={leave.cancelMyLeaveRequest}
						/>
					</div>
				</>
			)}
		</div>
	);
}
