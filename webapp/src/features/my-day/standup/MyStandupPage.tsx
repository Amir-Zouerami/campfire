import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import { CalendarX2, ClipboardList, Loader2, Send } from 'lucide-react';

import { evaluateStandupDay } from '@/api';
import { Button } from '@/components/ui/button';
import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireEmpty,
	CampfirePanel,
	CampfireStatusPill,
} from '@/app/campfire-ui';
import type { StandupRunDecision, Workspace } from '@/types/domain';

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
 * MyStandupPage renders the today-only My Day standup check-in flow.
 */
export function MyStandupPage(props: MyStandupPageProps): ReactElement {
	const standup = useMyStandup(props);
	const [runtimeDecision, setRuntimeDecision] = useState<StandupRunDecision | null>(null);
	const [runtimeLoading, setRuntimeLoading] = useState(false);
	const [runtimeMessage, setRuntimeMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		async function loadRuntimeDecision(): Promise<void> {
			if (standup.occurrenceDate.trim() === '') {
				return;
			}

			setRuntimeLoading(true);
			setRuntimeMessage('');

			try {
				const response = await evaluateStandupDay(props.workspace.id, standup.occurrenceDate);

				if (!isActive) {
					return;
				}

				setRuntimeDecision(response.decision);
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setRuntimeDecision(null);
				setRuntimeMessage(
					error instanceof Error ? error.message : 'Could not evaluate today’s standup runtime.',
				);
			} finally {
				if (isActive) {
					setRuntimeLoading(false);
				}
			}
		}

		void loadRuntimeDecision();

		return () => {
			isActive = false;
		};
	}, [props.workspace.id, standup.occurrenceDate]);

	function handleSubmit(event: FormEvent<HTMLFormElement>): void {
		event.preventDefault();

		if (runtimeDecision !== null && !runtimeDecision.shouldRun) {
			return;
		}

		void standup.submitCurrentStandup();
	}

	const formBlockedByRuntime = runtimeDecision !== null && !runtimeDecision.shouldRun;
	const formDisabled = standup.isBusy || runtimeLoading || formBlockedByRuntime;

	return (
		<CampfirePanel>
			<CampfireCardHeader
				eyebrow="Check-in"
				title="My standup"
				description="A focused today-only form. Off-days, past dates, and future dates cannot be submitted from My Day."
				icon={ClipboardList}
				action={
					<CampfireStatusPill tone={standup.selectedSchedule?.kind === 'weekly' ? 'ember' : 'green'}>
						{standup.selectedSchedule === null ? 'No schedule' : formatLabel(standup.selectedSchedule.kind)}
					</CampfireStatusPill>
				}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
				<MyStandupFeedback state={standup.loadState} message={standup.message} />

				{runtimeMessage.trim() !== '' && (
					<div className="cf:rounded-2xl cf:border cf:border-red-300/25 cf:bg-red-950/30 cf:px-4 cf:py-3 cf:text-sm cf:font-black cf:text-red-100">
						{runtimeMessage}
					</div>
				)}

				{standup.loadState === 'loading' && <MyStandupLoading />}

				{runtimeLoading && standup.loadState !== 'loading' && (
					<div className="cf:flex cf:items-center cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-4 cf:text-sm cf:font-bold cf:text-slate-300">
						<Loader2 className="cf:size-4 cf:animate-spin cf:text-amber-200" />
						Checking whether standup should run today…
					</div>
				)}

				{standup.loadState !== 'loading' && standup.schedules.length === 0 && (
					<CampfireEmpty
						icon={ClipboardList}
						title="No standup schedule"
						description="A Lead needs to create a daily or weekly schedule before members can submit standups."
					/>
				)}

				{standup.schedules.length > 0 && formBlockedByRuntime && (
					<CampfireEmpty
						icon={CalendarX2}
						title="No standup today"
						description={runtimeDecision.message || 'Today is not a standup day for this workspace.'}
					/>
				)}

				{standup.schedules.length > 0 && !formBlockedByRuntime && (
					<form className="cf:grid cf:gap-5" onSubmit={handleSubmit}>
						<MyStandupControls
							schedules={standup.schedules}
							templates={standup.templates}
							selectedScheduleID={standup.selectedScheduleID}
							occurrenceDate={standup.occurrenceDate}
							disabled={formDisabled}
							onScheduleChange={standup.handleScheduleChange}
						/>

						<MyStandupQuestionList
							questions={standup.visibleQuestions}
							answers={standup.answers}
							disabled={formDisabled}
							onAnswerChange={standup.updateAnswer}
						/>

						<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4">
							<p className="cf:m-0 cf:text-sm cf:font-semibold cf:leading-6 cf:text-muted-foreground">
								Submitting today updates your response and syncs itemized work lines into tasks when
								needed.
							</p>

							<Button type="submit" disabled={formDisabled || standup.visibleQuestions.length === 0}>
								{standup.isBusy ? (
									<Loader2 className="cf:size-4 cf:animate-spin" />
								) : (
									<Send className="cf:size-4" />
								)}
								{standup.isBusy ? 'Submitting…' : 'Submit standup'}
							</Button>
						</div>
					</form>
				)}
			</CampfireCardBody>
		</CampfirePanel>
	);
}
