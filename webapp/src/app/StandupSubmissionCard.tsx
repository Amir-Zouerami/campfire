import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';

import { ApiClientError, listMyTasks, listStandupConfiguration, submitStandup } from '../api/client';
import type { QuestionType, StandupQuestion, StandupSchedule, StandupTemplate, Task, Workspace } from '../types/domain';

/**
 * StandupSubmissionCardProps contains the workspace used for submissions.
 */
type StandupSubmissionCardProps = {
	readonly workspace: Workspace;
	readonly onStandupSubmitted: () => void;
};

/**
 * AnswerDraftValue represents a typed UI answer draft.
 */
type AnswerDraftValue = string | boolean | readonly string[];

/**
 * AnswerDrafts stores answer drafts keyed by question ID.
 */
type AnswerDrafts = Readonly<Record<string, AnswerDraftValue>>;

/**
 * LoadState describes the submission card loading state.
 */
type LoadState = 'idle' | 'loading' | 'ready' | 'saving' | 'error';

/**
 * StandupSubmissionCard renders the dynamic standup form and recent task context.
 */
export function StandupSubmissionCard(props: StandupSubmissionCardProps): ReactElement {
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [templates, setTemplates] = useState<readonly StandupTemplate[]>([]);
	const [questions, setQuestions] = useState<readonly StandupQuestion[]>([]);
	const [schedules, setSchedules] = useState<readonly StandupSchedule[]>([]);
	const [tasks, setTasks] = useState<readonly Task[]>([]);
	const [selectedScheduleID, setSelectedScheduleID] = useState('');
	const [occurrenceDate, setOccurrenceDate] = useState(getTodayLocalDateString());
	const [answers, setAnswers] = useState<AnswerDrafts>({});
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * Loads standup configuration and recent current-user tasks for submit context.
		 */
		async function loadInitialData(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const [configurationResponse, tasksResponse] = await Promise.all([
					listStandupConfiguration(props.workspace.id),
					listMyTasks(props.workspace.id, false),
				]);

				if (!isActive) {
					return;
				}

				const enabledSchedules = configurationResponse.schedules.filter(schedule => schedule.enabled);
				const defaultScheduleID = enabledSchedules[0]?.id ?? '';

				setTemplates(configurationResponse.templates);
				setQuestions(configurationResponse.questions);
				setSchedules(enabledSchedules);
				setTasks(tasksResponse.tasks);
				setSelectedScheduleID(defaultScheduleID);
				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setMessage(errorToMessage(error));
				setLoadState('error');
			}
		}

		void loadInitialData();

		return () => {
			isActive = false;
		};
	}, [props.workspace.id]);

	const selectedSchedule = useMemo(
		() => schedules.find(schedule => schedule.id === selectedScheduleID) ?? null,
		[schedules, selectedScheduleID],
	);

	const selectedTemplate = useMemo(
		() =>
			selectedSchedule === null
				? null
				: (templates.find(template => template.id === selectedSchedule.templateId) ?? null),
		[selectedSchedule, templates],
	);

	const selectedQuestions = useMemo(
		() =>
			selectedTemplate === null
				? []
				: questions
						.filter(question => question.templateId === selectedTemplate.id)
						.sort((first, second) => first.position - second.position),
		[questions, selectedTemplate],
	);

	const visibleTasks = useMemo(
		() =>
			tasks
				.filter(task => task.status !== 'archived' && task.status !== 'dropped')
				.sort((first, second) => {
					if (first.status === second.status) {
						return first.title.localeCompare(second.title);
					}

					return taskStatusWeight(first.status) - taskStatusWeight(second.status);
				})
				.slice(0, 8),
		[tasks],
	);

	useEffect(() => {
		setAnswers(buildInitialAnswers(selectedQuestions));
	}, [selectedQuestions]);

	const isBusy = loadState === 'loading' || loadState === 'saving';

	/**
	 * Updates one question answer draft.
	 */
	function updateAnswer(questionID: string, value: AnswerDraftValue): void {
		setAnswers(current => ({
			...current,
			[questionID]: value,
		}));
	}

	/**
	 * Submits the standup form.
	 */
	async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();

		if (selectedSchedule === null || selectedTemplate === null) {
			setMessage('Choose a standup schedule.');
			return;
		}

		if (occurrenceDate.trim() === '') {
			setMessage('Choose an occurrence date.');
			return;
		}

		const validationMessage = validateRequiredAnswers(selectedQuestions, answers);
		if (validationMessage !== null) {
			setMessage(validationMessage);
			return;
		}

		setLoadState('saving');
		setMessage('');

		try {
			const response = await submitStandup({
				workspaceId: props.workspace.id,
				templateId: selectedTemplate.id,
				scheduleId: selectedSchedule.id,
				occurrenceDate,
				answers: selectedQuestions.map(question => ({
					questionId: question.id,
					valueJson: answerValueToJSON(question.type, answers[question.id]),
				})),
			});

			setLoadState('ready');
			setMessage(`Standup submitted. Submission ${response.submission.id} is saved.`);
			props.onStandupSubmitted();
		} catch (error: unknown) {
			setLoadState('error');
			setMessage(errorToMessage(error));
		}
	}

	return (
		<section className="cf:mt-5 cf:rounded-3xl cf:border cf:border-orange-300/20 cf:bg-white/[0.055] cf:p-6 cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
			<div className="cf:grid cf:gap-5 cf:lg:grid-cols-[1fr_auto] cf:lg:items-start">
				<div>
					<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-orange-200">
						Submit
					</p>
					<h2 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
						Submit a standup
					</h2>
					<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">
						Fill today’s form with your active tasks visible beside it. Submitting again for the same date
						updates your previous submission.
					</p>
				</div>

				<div className="cf:w-fit cf:rounded-full cf:border cf:border-orange-300/25 cf:bg-orange-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-orange-100">
					{visibleTasks.length} active tasks
				</div>
			</div>

			{message !== '' && <p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{message}</p>}

			<div className="cf:mt-5 cf:grid cf:gap-5 cf:xl:grid-cols-[minmax(0,1fr)_22rem]">
				<form className="cf:grid cf:gap-4" onSubmit={event => void handleSubmit(event)}>
					<div className="cf:grid cf:gap-4 cf:lg:grid-cols-2">
						<label className="cf:grid cf:gap-2">
							<span className="cf:text-sm cf:font-black cf:text-slate-200">Schedule</span>
							<select
								className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:focus:border-orange-300/45"
								disabled={isBusy || schedules.length === 0}
								value={selectedScheduleID}
								onChange={event => setSelectedScheduleID(event.currentTarget.value)}
							>
								<option value="">Choose schedule</option>
								{schedules.map(schedule => (
									<option key={schedule.id} value={schedule.id}>
										{formatLabel(schedule.kind)} · {schedule.timeOfDay}
									</option>
								))}
							</select>
						</label>

						<label className="cf:grid cf:gap-2">
							<span className="cf:text-sm cf:font-black cf:text-slate-200">Occurrence date</span>
							<input
								className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:focus:border-orange-300/45"
								disabled={isBusy}
								type="date"
								value={occurrenceDate}
								onChange={event => setOccurrenceDate(event.currentTarget.value)}
							/>
						</label>
					</div>

					{selectedTemplate !== null && (
						<div className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/35 cf:p-4">
							<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-3">
								<div>
									<h3 className="cf:m-0 cf:text-lg cf:font-black cf:text-white">
										{selectedTemplate.name}
									</h3>
									{selectedTemplate.description !== '' && (
										<p className="cf:m-0 cf:mt-1 cf:text-sm cf:leading-6 cf:text-slate-300">
											{selectedTemplate.description}
										</p>
									)}
								</div>

								<span className="cf:rounded-full cf:border cf:border-white/10 cf:bg-white/[0.06] cf:px-3 cf:py-1 cf:text-xs cf:font-extrabold cf:text-slate-200">
									{formatLabel(selectedTemplate.kind)}
								</span>
							</div>

							<div className="cf:mt-4 cf:grid cf:gap-4">
								{selectedQuestions.length === 0 && (
									<p className="cf:m-0 cf:rounded-2xl cf:border cf:border-dashed cf:border-white/10 cf:p-4 cf:text-slate-300">
										This template has no questions yet.
									</p>
								)}

								{selectedQuestions.map(question => (
									<QuestionField
										disabled={isBusy}
										key={question.id}
										question={question}
										value={answers[question.id]}
										onChange={value => updateAnswer(question.id, value)}
									/>
								))}
							</div>
						</div>
					)}

					{loadState === 'loading' && <p className="cf:m-0 cf:text-slate-300">Loading standup form…</p>}

					{loadState !== 'loading' && schedules.length === 0 && (
						<p className="cf:m-0 cf:rounded-2xl cf:border cf:border-dashed cf:border-white/10 cf:p-4 cf:text-slate-300">
							No enabled standup schedules are configured yet.
						</p>
					)}

					<button
						className="cf:rounded-2xl cf:border cf:border-orange-300/30 cf:bg-orange-400/20 cf:px-5 cf:py-3 cf:font-black cf:text-orange-50 cf:transition cf:hover:bg-orange-400/30 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
						disabled={isBusy || selectedSchedule === null || selectedTemplate === null}
						type="submit"
					>
						Submit standup
					</button>
				</form>

				<PreviousTasksPanel tasks={visibleTasks} />
			</div>
		</section>
	);
}

/**
 * PreviousTasksPanel renders active task context next to the standup form.
 */
function PreviousTasksPanel(props: { readonly tasks: readonly Task[] }): ReactElement {
	return (
		<aside className="cf:h-fit cf:rounded-3xl cf:border cf:border-lime-300/20 cf:bg-lime-300/10 cf:p-4">
			<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.16em] cf:text-lime-200">
				Task context
			</p>
			<h3 className="cf:m-0 cf:mt-2 cf:text-lg cf:font-black cf:text-white">Previous active tasks</h3>
			<p className="cf:m-0 cf:mt-1 cf:text-sm cf:leading-6 cf:text-slate-300">
				Use these as context while writing today’s update.
			</p>

			<div className="cf:mt-4 cf:grid cf:gap-3">
				{props.tasks.length === 0 && (
					<p className="cf:m-0 cf:rounded-2xl cf:border cf:border-dashed cf:border-lime-200/20 cf:p-4 cf:text-sm cf:text-slate-300">
						No active tasks yet.
					</p>
				)}

				{props.tasks.map(task => (
					<article
						className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/45 cf:p-3"
						key={task.id}
					>
						<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-2">
							<strong className="cf:text-sm cf:font-black cf:text-white">{task.title}</strong>
							<span className="cf:rounded-full cf:border cf:border-white/10 cf:bg-white/[0.06] cf:px-2.5 cf:py-1 cf:text-[11px] cf:font-extrabold cf:text-slate-200">
								{formatLabel(task.status)}
							</span>
						</div>

						{task.description !== '' && (
							<p className="cf:m-0 cf:mt-2 cf:line-clamp-3 cf:text-xs cf:leading-5 cf:text-slate-300">
								{task.description}
							</p>
						)}

						<div className="cf:mt-2 cf:flex cf:flex-wrap cf:gap-2">
							<TaskMetaChip label="Project" value={task.projectId} />
							<TaskMetaChip label="Category" value={task.categoryId} />
						</div>

						{task.boardUrl !== '' && (
							<a
								className="cf:mt-2 cf:inline-block cf:text-xs cf:font-black cf:text-lime-200 cf:hover:text-lime-100"
								href={task.boardUrl}
								rel="noreferrer"
								target="_blank"
							>
								Open board link
							</a>
						)}
					</article>
				))}
			</div>
		</aside>
	);
}

/**
 * TaskMetaChip renders optional task metadata.
 */
function TaskMetaChip(props: { readonly label: string; readonly value: string }): ReactElement | null {
	if (props.value.trim() === '') {
		return null;
	}

	return (
		<span className="cf:rounded-full cf:border cf:border-lime-300/20 cf:bg-lime-300/10 cf:px-2.5 cf:py-1 cf:text-[11px] cf:font-extrabold cf:text-lime-100">
			{props.label}: {props.value}
		</span>
	);
}

/**
 * QuestionField renders one dynamic standup question.
 */
function QuestionField(props: {
	readonly disabled: boolean;
	readonly question: StandupQuestion;
	readonly value: AnswerDraftValue | undefined;
	readonly onChange: (value: AnswerDraftValue) => void;
}): ReactElement {
	const requiredMark = props.question.required ? ' *' : '';

	return (
		<label className="cf:grid cf:gap-2">
			<span className="cf:text-sm cf:font-black cf:text-slate-200">
				{props.question.label}
				{requiredMark}
			</span>

			{props.question.helpText !== '' && (
				<span className="cf:text-xs cf:font-bold cf:text-slate-400">{props.question.helpText}</span>
			)}

			<QuestionInput
				disabled={props.disabled}
				question={props.question}
				value={props.value}
				onChange={props.onChange}
			/>
		</label>
	);
}

/**
 * QuestionInput renders the input control for one question type.
 */
function QuestionInput(props: {
	readonly disabled: boolean;
	readonly question: StandupQuestion;
	readonly value: AnswerDraftValue | undefined;
	readonly onChange: (value: AnswerDraftValue) => void;
}): ReactElement {
	switch (props.question.type) {
		case 'long_text':
			return (
				<textarea
					className="cf:min-h-28 cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:placeholder:text-slate-500 cf:focus:border-orange-300/45"
					disabled={props.disabled}
					placeholder={props.question.placeholder}
					value={stringValue(props.value)}
					onChange={event => props.onChange(event.currentTarget.value)}
				/>
			);

		case 'checkbox':
		case 'boolean':
			return (
				<span className="cf:flex cf:items-center cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3">
					<input
						checked={booleanValue(props.value)}
						disabled={props.disabled}
						type="checkbox"
						onChange={event => props.onChange(event.currentTarget.checked)}
					/>
					<span className="cf:text-sm cf:font-bold cf:text-slate-200">Yes</span>
				</span>
			);

		case 'dropdown':
			return (
				<select
					className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:focus:border-orange-300/45"
					disabled={props.disabled}
					value={stringValue(props.value)}
					onChange={event => props.onChange(event.currentTarget.value)}
				>
					<option value="">Choose an option</option>
					{props.question.options.map(option => (
						<option key={option} value={option}>
							{option}
						</option>
					))}
				</select>
			);

		case 'multi_select':
			return (
				<div className="cf:grid cf:gap-2 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:p-3">
					{props.question.options.length === 0 && (
						<p className="cf:m-0 cf:text-sm cf:text-slate-400">No options configured.</p>
					)}

					{props.question.options.map(option => {
						const currentValues = stringArrayValue(props.value);
						const checked = currentValues.includes(option);

						return (
							<label className="cf:flex cf:items-center cf:gap-3" key={option}>
								<input
									checked={checked}
									disabled={props.disabled}
									type="checkbox"
									onChange={event =>
										props.onChange(
											event.currentTarget.checked
												? [...currentValues, option]
												: currentValues.filter(value => value !== option),
										)
									}
								/>
								<span className="cf:text-sm cf:font-bold cf:text-slate-200">{option}</span>
							</label>
						);
					})}
				</div>
			);

		case 'number':
			return (
				<input
					className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:placeholder:text-slate-500 cf:focus:border-orange-300/45"
					disabled={props.disabled}
					placeholder={props.question.placeholder}
					type="number"
					value={stringValue(props.value)}
					onChange={event => props.onChange(event.currentTarget.value)}
				/>
			);

		case 'duration':
			return (
				<input
					className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:placeholder:text-slate-500 cf:focus:border-orange-300/45"
					disabled={props.disabled}
					min={0}
					placeholder={props.question.placeholder || 'Minutes'}
					type="number"
					value={stringValue(props.value)}
					onChange={event => props.onChange(event.currentTarget.value)}
				/>
			);

		case 'text':
			return (
				<input
					className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:placeholder:text-slate-500 cf:focus:border-orange-300/45"
					disabled={props.disabled}
					placeholder={props.question.placeholder}
					type="text"
					value={stringValue(props.value)}
					onChange={event => props.onChange(event.currentTarget.value)}
				/>
			);
	}
}

/**
 * buildInitialAnswers creates empty answer drafts for a template's questions.
 */
function buildInitialAnswers(questions: readonly StandupQuestion[]): AnswerDrafts {
	const result: Record<string, AnswerDraftValue> = {};

	for (const question of questions) {
		result[question.id] = initialAnswerValue(question.type);
	}

	return result;
}

/**
 * initialAnswerValue returns an empty draft value for a question type.
 */
function initialAnswerValue(type: QuestionType): AnswerDraftValue {
	switch (type) {
		case 'checkbox':
		case 'boolean':
			return false;

		case 'multi_select':
			return [];

		case 'text':
		case 'long_text':
		case 'dropdown':
		case 'number':
		case 'duration':
			return '';
	}
}

/**
 * validateRequiredAnswers checks required question drafts.
 */
function validateRequiredAnswers(questions: readonly StandupQuestion[], answers: AnswerDrafts): string | null {
	for (const question of questions) {
		if (!question.required) {
			continue;
		}

		const value = answers[question.id];

		if (question.type === 'checkbox' || question.type === 'boolean') {
			if (value !== true) {
				return `${question.label} is required.`;
			}

			continue;
		}

		if (question.type === 'multi_select') {
			if (stringArrayValue(value).length === 0) {
				return `${question.label} is required.`;
			}

			continue;
		}

		if (stringValue(value).trim() === '') {
			return `${question.label} is required.`;
		}
	}

	return null;
}

/**
 * answerValueToJSON serializes one answer draft for the backend.
 */
function answerValueToJSON(type: QuestionType, value: AnswerDraftValue | undefined): string {
	switch (type) {
		case 'checkbox':
		case 'boolean':
			return JSON.stringify(booleanValue(value));

		case 'multi_select':
			return JSON.stringify(stringArrayValue(value));

		case 'number': {
			const rawValue = stringValue(value).trim();
			if (rawValue === '') {
				return JSON.stringify('');
			}

			const parsed = Number(rawValue);
			return Number.isFinite(parsed) ? JSON.stringify(parsed) : JSON.stringify(rawValue);
		}

		case 'duration': {
			const rawValue = stringValue(value).trim();
			if (rawValue === '') {
				return JSON.stringify('');
			}

			const parsed = Number.parseInt(rawValue, 10);
			return Number.isFinite(parsed) ? JSON.stringify(parsed) : JSON.stringify(rawValue);
		}

		case 'text':
		case 'long_text':
		case 'dropdown':
			return JSON.stringify(stringValue(value));
	}
}

/**
 * stringValue normalizes draft values into a string.
 */
function stringValue(value: AnswerDraftValue | undefined): string {
	return typeof value === 'string' ? value : '';
}

/**
 * booleanValue normalizes draft values into a boolean.
 */
function booleanValue(value: AnswerDraftValue | undefined): boolean {
	return typeof value === 'boolean' ? value : false;
}

/**
 * stringArrayValue normalizes draft values into a string array.
 */
function stringArrayValue(value: AnswerDraftValue | undefined): readonly string[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.filter(item => typeof item === 'string');
}

/**
 * taskStatusWeight sorts active task statuses before less-current statuses.
 */
function taskStatusWeight(status: Task['status']): number {
	switch (status) {
		case 'active':
			return 0;

		case 'blocked':
			return 1;

		case 'completed':
			return 2;

		case 'dropped':
			return 3;

		case 'archived':
			return 4;
	}
}

/**
 * getTodayLocalDateString returns today's local YYYY-MM-DD date.
 */
function getTodayLocalDateString(): string {
	const today = new Date();
	const year = String(today.getFullYear());
	const month = String(today.getMonth() + 1).padStart(2, '0');
	const day = String(today.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

/**
 * formatLabel converts enum-like values to readable labels.
 */
function formatLabel(value: string): string {
	return value
		.split('_')
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
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

	return 'Could not submit standup.';
}
