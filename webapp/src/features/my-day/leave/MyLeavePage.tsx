import type { ReactElement } from 'react';

import { CampfireEmpty } from '@/components/campfire/CampfireLayoutPrimitives';
import { CampfirePageIntro } from '@/components/campfire/CampfirePageIntro';
import { useI18n } from '@/i18n';
import type { Workspace } from '@/types/domain';

import { MyActiveLeavePanel } from './MyActiveLeavePanel';
import { MyLeaveFeedback, MyLeaveLoading, MyLeaveWarnings } from './MyLeaveFeedback';
import { MyLeaveRequestPanel } from './MyLeaveRequestPanel';
import { useMyLeaveText } from './my-leave.i18n';
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
	const { t } = useI18n();
	const leaveText = useMyLeaveText();
	const leave = useMyLeave({
		workspace: props.workspace,
		text: leaveText,
		onLeaveCreated: props.onLeaveCreated,
		onLeaveCancelled: props.onLeaveCancelled,
	});
	return (
		<div className="campfire-page-stack campfire-my-leave-page">
			<CampfirePageIntro
				eyebrow={t('myDay.leave.page.eyebrow')}
				title={t('myDay.leave.page.title')}
				description={t('myDay.leave.page.description')}
			/>

			<MyLeaveFeedback state={leave.loadState} message={leave.message} />
			{leave.loadState === 'loading' && <MyLeaveLoading />}

			{leave.loadState !== 'loading' && leave.leaveTypes.length === 0 && (
				<CampfireEmpty
					title={t('myDay.leave.empty.types.title')}
					description={t('myDay.leave.empty.types.description')}
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
							workingDays={props.workspace.workingDays}
							onChange={leave.updateDraft}
							onSubmit={leave.submitLeaveRequest}
						/>

						<MyActiveLeavePanel
							leaveRequests={leave.myActiveLeaves}
							leaveTypes={leave.leaveTypes}
							disabled={leave.isBusy}
							timezone={props.workspace.timezone}
							workingDays={props.workspace.workingDays}
							onCancel={leave.cancelMyLeaveRequest}
							onRequestChange={leave.requestMyLeaveChange}
						/>
					</div>
				</>
			)}
		</div>
	);
}

