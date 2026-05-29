import type { FormEvent, ReactElement } from 'react';
import { CalendarX2, ClipboardList, Loader2, Send } from 'lucide-react';

import { CampfireEmpty, CampfireStatusPill, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';
import { Button } from '@/components/ui/button';
import type { Workspace } from '@/types/domain';

import { formatLabel } from './my-standup.helpers';
import { MyStandupControls } from './MyStandupControls';
import { MyStandupFeedback, MyStandupLoading } from './MyStandupFeedback';
import { MyStandupQuestionList } from './MyStandupQuestionList';
import { useMyStandup } from './useMyStandup';

/**
 * MyStandupPageProps contains the workspace and refresh callback for check-in.
 */
type MyStandupPageProps = {
	readonly workspace: Workspace;
	readonly onStandupSubmitted: () => void;
};

/**
 * MyStandupPage renders the selected-date My Day standup check-in flow.
 */
export function MyStandupPage(props: MyStandupPageProps): ReactElement {
	const standup = useMyStandup(props);

	function handleSubmit(event: FormEvent<HTMLFormElement>): void {
		event.preventDefault();
		void standup.submitCurrentStandup();
	}

	const formBlocked = standup.dateBlockedMessage !== '';
	const formDisabled = standup.isBusy || formBlocked;

	return (
		<CampfireSurface className="campfire-standup-surface">
			<div className="campfire-surface-header campfire-surface-header--with-action">
				<div>
					<p className="campfire-page-eyebrow">Standup</p>
					<h3 className="campfire-surface-title">My Standup</h3>
					<p className="campfire-surface-description">
						Choose today or a previous valid working day. Future dates, off-days, and non-working days stay blocked.
					</p>
				</div>

				<CampfireStatusPill tone={standup.selectedSchedule?.kind === 'weekly' ? 'ember' : 'green'}>
					{standup.selectedSchedule === null ? 'No schedule' : formatLabel(standup.selectedSchedule.kind)}
				</CampfireStatusPill>
			</div>

			<div className="campfire-standup-body">
				<MyStandupFeedback state={standup.loadState} message={standup.message} />

				{standup.loadState === 'loading' && <MyStandupLoading />}

				{standup.loadState !== 'loading' && standup.schedules.length === 0 && (
					<CampfireEmpty
						icon={ClipboardList}
						title="No standup schedule"
						description="A Lead needs to create a daily or weekly schedule before members can submit standups."
					/>
				)}

				{standup.schedules.length > 0 && (
					<form className="campfire-standup-form" onSubmit={handleSubmit}>
						<MyStandupControls
							schedules={standup.availableSchedules}
							templates={standup.templates}
							selectedScheduleID={standup.selectedScheduleID}
							occurrenceDate={standup.occurrenceDate}
							timezone={props.workspace.timezone}
							disabled={standup.isBusy}
							onDateChange={standup.handleDateChange}
							onScheduleChange={standup.handleScheduleChange}
						/>

						{formBlocked && (
							<CampfireEmpty
								icon={CalendarX2}
								title="No standup for this date"
								description={standup.dateBlockedMessage}
							/>
						)}

						{!formBlocked && (
							<>
								<MyStandupQuestionList
									questions={standup.visibleQuestions}
									answers={standup.answers}
									tasks={standup.tasks}
									disabled={formDisabled}
									onAnswerChange={standup.updateAnswer}
								/>

								<div className="campfire-submit-strip campfire-submit-strip--actions-only">
									<Button type="submit" disabled={formDisabled || standup.visibleQuestions.length === 0}>
										{standup.isBusy ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Send className="cf:size-4" />}
										{standup.isBusy ? 'Saving…' : 'Save standup'}
									</Button>
								</div>
							</>
						)}
					</form>
				)}
			</div>
		</CampfireSurface>
	);
}
