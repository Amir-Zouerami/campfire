import type { FormEvent, ReactElement } from 'react';
import { CalendarX2, ClipboardList, Loader2, Send } from 'lucide-react';

import { CampfireEmpty, CampfireStatusPill, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';
import { CampfirePageIntro } from '@/components/campfire/CampfirePageIntro';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';
import type { Workspace } from '@/types/domain';

import { localizedScheduleKindLabel } from './my-standup.helpers';
import { MyStandupControls } from './MyStandupControls';
import { MyStandupFeedback, MyStandupLoading } from './MyStandupFeedback';
import { MyStandupQuestionList } from './MyStandupQuestionList';
import { useMyStandup } from './useMyStandup';

/**
 * MyStandupPageProps contains the workspace and refresh callback for check-in.
 */
type MyStandupPageProps = {
	readonly workspace: Workspace;
	readonly canSubmitStandup: boolean;
	readonly onStandupSubmitted: () => void;
};

/**
 * MyStandupPage renders the selected-date My Day standup check-in flow.
 */
export function MyStandupPage(props: MyStandupPageProps): ReactElement {
	const { t } = useI18n();
	const standup = useMyStandup(props);

	if (!props.canSubmitStandup) {
		return (
			<div className="campfire-page-stack campfire-my-standup-page">
				<CampfirePageIntro
					eyebrow={t('myDay.standup.excluded.eyebrow')}
					title={t('myDay.standup.excluded.title')}
					description={t('myDay.standup.excluded.description')}
					actions={<CampfireStatusPill tone="slate">{t('myDay.standup.excluded.status')}</CampfireStatusPill>}
				/>

				<CampfireSurface className="campfire-standup-surface campfire-standup-surface--minimal">
					<CampfireEmpty
						icon={CalendarX2}
						title={t('myDay.standup.excluded.empty.title')}
						description={t('myDay.standup.excluded.empty.description')}
					/>
				</CampfireSurface>
			</div>
		);
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>): void {
		event.preventDefault();
		void standup.submitCurrentStandup();
	}

	const formBlocked = standup.dateBlockedMessage !== '';
	const formDisabled = standup.isBusy || formBlocked;
	const scheduleLabel = standup.selectedSchedule === null
		? t('myDay.standup.schedule.none')
		: localizedScheduleKindLabel(standup.selectedSchedule.kind, t);

	return (
		<div className="campfire-page-stack campfire-my-standup-page">
			<CampfirePageIntro
				eyebrow={t('myDay.standup.page.eyebrow')}
				title={t('myDay.standup.page.title')}
				description={t('myDay.standup.page.description')}
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
							title={t('myDay.standup.schedule.empty.title')}
							description={t('myDay.standup.schedule.empty.description')}
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
								workingDays={props.workspace.workingDays}
								disabled={standup.isBusy}
								onDateChange={standup.handleDateChange}
								onScheduleChange={standup.handleScheduleChange}
							/>

							{formBlocked && (
								<CampfireEmpty
									icon={CalendarX2}
									title={t('myDay.standup.form.blocked.title')}
									description={standup.dateBlockedMessage}
								/>
							)}

							{!formBlocked && (
								<>
									<MyStandupQuestionList
										questions={standup.visibleQuestions}
										answers={standup.answers}
										tasks={standup.tasks}
										timezone={props.workspace.timezone}
										disabled={formDisabled}
										onAnswerChange={standup.updateAnswer}
									/>

									<div className="campfire-submit-strip campfire-submit-strip--actions-only">
										<Button type="submit" disabled={formDisabled || standup.visibleQuestions.length === 0}>
											{standup.isBusy ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Send className="cf:size-4" />}
											{standup.isBusy ? t('myDay.standup.submit.saving') : t('myDay.standup.submit.idle')}
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
