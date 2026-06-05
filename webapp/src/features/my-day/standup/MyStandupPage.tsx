import type { FormEvent, ReactElement } from 'react';
import { CalendarX2, ClipboardList, Loader2, Send } from 'lucide-react';

import { CampfireEmpty, CampfireStatusPill, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';
import { CampfirePageIntro } from '@/components/campfire/CampfirePageIntro';
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
	const scheduleLabel = standup.selectedSchedule === null ? 'No schedule' : formatLabel(standup.selectedSchedule.kind);

	return (
		<div className="campfire-page-stack campfire-my-standup-page">
			<CampfirePageIntro
				eyebrow="Standup"
				title="Fill in your standup"
				description="Choose the schedule and date, answer the questions, then save your standup."
				actions={
					<CampfireStatusPill tone={standup.selectedSchedule?.kind === 'weekly' ? 'ember' : 'green'}>
						{scheduleLabel}
					</CampfireStatusPill>
				}
			/>

			<CampfireSurface className="campfire-standup-surface campfire-standup-surface--minimal">
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
		</div>
	);
}
