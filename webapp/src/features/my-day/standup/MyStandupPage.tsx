import type { FormEvent, ReactElement } from 'react';
import { ClipboardList, Loader2, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireEmpty,
	CampfirePanel,
	CampfireStatusPill,
} from '@/app/campfire-ui';
import type { Workspace } from '@/types/domain';

import { formatLabel } from './my-standup.helpers';
import { MyStandupControls } from './MyStandupControls';
import { MyStandupFeedback, MyStandupLoading } from './MyStandupFeedback';
import { MyStandupQuestionList } from './MyStandupQuestionList';
import { MyStandupTaskContext } from './MyStandupTaskContext';
import { useMyStandup } from './useMyStandup';

/**
 * MyStandupPageProps contains the workspace and refresh callback for check-in.
 */
type MyStandupPageProps = {
	readonly workspace: Workspace;
	readonly onStandupSubmitted: () => void;
};

/**
 * MyStandupPage renders the rewritten My Day standup check-in flow.
 */
export function MyStandupPage(props: MyStandupPageProps): ReactElement {
	const standup = useMyStandup(props);

	/**
	 * handleSubmit submits the current standup draft.
	 */
	function handleSubmit(event: FormEvent<HTMLFormElement>): void {
		event.preventDefault();
		void standup.submitCurrentStandup();
	}

	return (
		<CampfirePanel className="cf:overflow-hidden">
			<CampfireCardHeader
				eyebrow="Check-in"
				title="My standup"
				description="A focused daily form. Team review, report previews, and configuration live elsewhere."
				icon={ClipboardList}
				action={
					<CampfireStatusPill tone={standup.selectedSchedule?.kind === 'weekly' ? 'ember' : 'green'}>
						{standup.selectedSchedule === null ? 'No schedule' : formatLabel(standup.selectedSchedule.kind)}
					</CampfireStatusPill>
				}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
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
					<form className="cf:grid cf:gap-5" onSubmit={handleSubmit}>
						<MyStandupControls
							schedules={standup.schedules}
							templates={standup.templates}
							selectedScheduleID={standup.selectedScheduleID}
							occurrenceDate={standup.occurrenceDate}
							disabled={standup.isBusy}
							onScheduleChange={standup.handleScheduleChange}
							onOccurrenceDateChange={standup.setOccurrenceDate}
						/>

						<MyStandupQuestionList
							questions={standup.visibleQuestions}
							answers={standup.answers}
							disabled={standup.isBusy}
							onAnswerChange={standup.updateAnswer}
						/>

						<MyStandupTaskContext activeTasks={standup.activeTasks} />

						<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-4">
							<p className="cf:text-sm cf:font-semibold cf:leading-6 cf:text-muted-foreground">
								Submitting again updates your response while preserving the original first-submitted
								time.
							</p>

							<Button type="submit" disabled={standup.isBusy}>
								{standup.loadState === 'saving' ? (
									<Loader2 className="cf:size-4 cf:animate-spin" />
								) : (
									<Send className="cf:size-4" />
								)}
								Submit standup
							</Button>
						</div>
					</form>
				)}
			</CampfireCardBody>
		</CampfirePanel>
	);
}
