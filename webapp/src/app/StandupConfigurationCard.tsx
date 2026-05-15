import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';

import { ApiClientError, listStandupConfiguration } from '../api/client';
import type { StandupQuestion, StandupSchedule, StandupTemplate, Workspace } from '../types/domain';

/**
 * StandupConfigurationCardProps contains workspace and refresh data.
 */
type StandupConfigurationCardProps = {
	readonly workspace: Workspace;
};

/**
 * LoadState describes the standup configuration loading state.
 */
type LoadState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * StandupConfigurationCard renders standup templates, questions, and schedules.
 */
export function StandupConfigurationCard(props: StandupConfigurationCardProps): ReactElement {
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [templates, setTemplates] = useState<readonly StandupTemplate[]>([]);
	const [questions, setQuestions] = useState<readonly StandupQuestion[]>([]);
	const [schedules, setSchedules] = useState<readonly StandupSchedule[]>([]);
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		async function loadConfiguration(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const response = await listStandupConfiguration(props.workspace.id);

				if (!isActive) {
					return;
				}

				setTemplates(response.templates);
				setQuestions(response.questions);
				setSchedules(response.schedules);
				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setMessage(errorToMessage(error));
				setLoadState('error');
			}
		}

		void loadConfiguration();

		return () => {
			isActive = false;
		};
	}, [props.workspace.id]);

	const questionsByTemplateID = useMemo(() => groupQuestionsByTemplateID(questions), [questions]);
	const schedulesByTemplateID = useMemo(() => groupSchedulesByTemplateID(schedules), [schedules]);

	return (
		<section className="cf:mt-5 cf:rounded-3xl cf:border cf:border-amber-300/20 cf:bg-white/[0.055] cf:p-6 cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
			<div className="cf:grid cf:gap-5 cf:lg:grid-cols-[1fr_auto] cf:lg:items-start">
				<div>
					<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-amber-200">
						Standups
					</p>
					<h2 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
						Templates and schedules
					</h2>
					<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">
						These are the dynamic forms and reminder schedules Campfire will use for daily standups and
						last-working-day weekly summaries.
					</p>
				</div>

				<div className="cf:w-fit cf:rounded-full cf:border cf:border-amber-300/25 cf:bg-amber-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-amber-200">
					{templates.length} templates
				</div>
			</div>

			{loadState === 'loading' && (
				<p className="cf:m-0 cf:mt-5 cf:text-slate-300">Loading standup configuration…</p>
			)}

			{message !== '' && <p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{message}</p>}

			{loadState !== 'loading' && templates.length === 0 && (
				<p className="cf:m-0 cf:mt-5 cf:text-slate-300">
					No standup templates found. Workspace setup should seed the default daily and weekly templates.
				</p>
			)}

			<div className="cf:mt-5 cf:grid cf:gap-4">
				{templates.map(template => (
					<article
						className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4"
						key={template.id}
					>
						<div className="cf:flex cf:flex-col cf:gap-3 cf:sm:flex-row cf:sm:items-start cf:sm:justify-between">
							<div>
								<strong className="cf:block cf:text-lg cf:font-black cf:text-white">
									{template.name}
								</strong>
								<p className="cf:m-0 cf:mt-1 cf:text-sm cf:leading-6 cf:text-slate-300">
									{template.description || 'No description yet.'}
								</p>
							</div>

							<div className="cf:flex cf:flex-wrap cf:gap-2">
								<StatusBadge label={template.kind} />
								{template.isDefault && <StatusBadge label="default" />}
							</div>
						</div>

						<div className="cf:mt-4 cf:grid cf:gap-4 cf:lg:grid-cols-2">
							<TemplateQuestions questions={questionsByTemplateID[template.id] ?? []} />
							<TemplateSchedules schedules={schedulesByTemplateID[template.id] ?? []} />
						</div>
					</article>
				))}
			</div>
		</section>
	);
}

/**
 * TemplateQuestions renders template questions.
 */
function TemplateQuestions(props: { readonly questions: readonly StandupQuestion[] }): ReactElement {
	return (
		<div className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-4">
			<strong className="cf:block cf:text-base cf:font-black cf:text-white">Questions</strong>

			{props.questions.length === 0 && (
				<p className="cf:m-0 cf:mt-2 cf:text-sm cf:text-slate-300">No questions configured.</p>
			)}

			{props.questions.length > 0 && (
				<ol className="cf:m-0 cf:mt-3 cf:grid cf:list-none cf:gap-3 cf:p-0">
					{props.questions.map(question => (
						<li
							className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/35 cf:p-3"
							key={question.id}
						>
							<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
								<span className="cf:rounded-full cf:bg-amber-300/10 cf:px-2.5 cf:py-1 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.1em] cf:text-amber-200">
									{question.type}
								</span>
								{question.required && (
									<span className="cf:rounded-full cf:bg-red-300/10 cf:px-2.5 cf:py-1 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.1em] cf:text-red-200">
										Required
									</span>
								)}
							</div>
							<p className="cf:m-0 cf:mt-2 cf:text-sm cf:font-bold cf:text-slate-100">
								{question.prompt || question.label}
							</p>
							{question.options.length > 0 && (
								<p className="cf:m-0 cf:mt-2 cf:text-xs cf:text-slate-400">
									Options: {question.options.join(', ')}
								</p>
							)}
						</li>
					))}
				</ol>
			)}
		</div>
	);
}

/**
 * TemplateSchedules renders template schedules.
 */
function TemplateSchedules(props: { readonly schedules: readonly StandupSchedule[] }): ReactElement {
	return (
		<div className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-4">
			<strong className="cf:block cf:text-base cf:font-black cf:text-white">Schedules</strong>

			{props.schedules.length === 0 && (
				<p className="cf:m-0 cf:mt-2 cf:text-sm cf:text-slate-300">No schedule attached.</p>
			)}

			{props.schedules.length > 0 && (
				<div className="cf:mt-3 cf:grid cf:gap-3">
					{props.schedules.map(schedule => (
						<div
							className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/35 cf:p-3"
							key={schedule.id}
						>
							<div className="cf:flex cf:flex-wrap cf:gap-2">
								<StatusBadge label={schedule.enabled ? 'enabled' : 'disabled'} />
								<StatusBadge label={schedule.kind} />
								{schedule.weeklyMode !== '' && <StatusBadge label={schedule.weeklyMode} />}
							</div>

							<p className="cf:m-0 cf:mt-2 cf:text-sm cf:text-slate-200">
								Runs at <strong>{schedule.timeOfDay}</strong>
							</p>

							<ul className="cf:m-0 cf:mt-2 cf:grid cf:list-none cf:gap-1 cf:p-0 cf:text-xs cf:text-slate-400">
								<li>Skip non-working days: {schedule.skipNonWorkingDays ? 'yes' : 'no'}</li>
								<li>Skip daily when weekly runs: {schedule.skipDailyWhenWeeklyRuns ? 'yes' : 'no'}</li>
							</ul>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

/**
 * StatusBadge renders a compact status badge.
 */
function StatusBadge(props: { readonly label: string }): ReactElement {
	return (
		<span className="cf:w-fit cf:rounded-full cf:border cf:border-amber-300/20 cf:bg-amber-300/10 cf:px-2.5 cf:py-1 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.1em] cf:text-amber-200">
			{props.label}
		</span>
	);
}

/**
 * groupQuestionsByTemplateID groups questions by template ID.
 */
function groupQuestionsByTemplateID(
	questions: readonly StandupQuestion[],
): Readonly<Record<string, readonly StandupQuestion[]>> {
	const groups: Record<string, StandupQuestion[]> = {};

	for (const question of questions) {
		const group = groups[question.templateId] ?? [];
		group.push(question);
		groups[question.templateId] = group;
	}

	return groups;
}

/**
 * groupSchedulesByTemplateID groups schedules by template ID.
 */
function groupSchedulesByTemplateID(
	schedules: readonly StandupSchedule[],
): Readonly<Record<string, readonly StandupSchedule[]>> {
	const groups: Record<string, StandupSchedule[]> = {};

	for (const schedule of schedules) {
		const group = groups[schedule.templateId] ?? [];
		group.push(schedule);
		groups[schedule.templateId] = group;
	}

	return groups;
}

/**
 * errorToMessage converts unknown thrown values into a safe UI message.
 */
function errorToMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return 'Could not load standup configuration.';
}
