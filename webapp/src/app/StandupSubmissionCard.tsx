import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';

import { ApiClientError, listStandupConfiguration, submitStandup } from '../api/client';
import type { QuestionType, StandupQuestion, StandupSchedule, StandupTemplate, Workspace } from '../types/domain';

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
 * StandupSubmissionCard renders the first dynamic standup submission form.
 */
export function StandupSubmissionCard(props: StandupSubmissionCardProps): ReactElement {
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [templates, setTemplates] = useState<readonly StandupTemplate[]>([]);
	const [questions, setQuestions] = useState<readonly StandupQuestion[]>([]);
	const [schedules, setSchedules] = useState<readonly StandupSchedule[]>([]);
	const [selectedScheduleID, setSelectedScheduleID] = useState('');
	const [occurrenceDate, setOccurrenceDate] = useState(getTodayLocalDateString());
	const [answers, setAnswers] = useState<AnswerDrafts>({});
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

				const enabledSchedules = response.schedules.filter(schedule => schedule.enabled);
				const defaultScheduleID = enabledSchedules[0]?.id ?? '';

				setTemplates(response.templates);
				setQuestions(response.questions);
				setSchedules(enabledSchedules);
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

		void loadConfiguration();

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

	useEffect(() => {
		setAnswers(buildInitialAnswers(selectedQuestions));
	}, [selectedQuestions]);

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

	const isBusy = loadState === 'loading' || loadState === 'saving';

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
						This dynamic form is rendered from Campfire’s seeded standup questions. Submitting again for the
						same date updates your previous submission.
					</p>
				</div>

				{selectedTemplate !== null && (
					<div className="cf:w-fit cf:rounded-full cf:border cf:border-orange-300/25 cf:bg-orange-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-orange-200">
						{selectedTemplate.kind}
					</div>
				)}
			</div>

			{loadState === 'loading' && <p className="cf:m-0 cf:mt-5 cf:text-slate-300">Loading standup form…</p>}

			<form className="cf:mt-5 cf:grid cf:gap-4" onSubmit={handleSubmit}>
				<div className="cf:grid cf:gap-4 cf:lg:grid-cols-2">
					<Field label="Schedule">
						<select
							className={inputClassName}
							value={selectedScheduleID}
							disabled={isBusy}
							onChange={event => setSelectedScheduleID(event.currentTarget.value)}
						>
							{schedules.map(schedule => (
								<option value={schedule.id} key={schedule.id}>
									{schedule.kind} · {schedule.timeOfDay}
								</option>
							))}
						</select>
					</Field>

					<Field label="Occurrence date">
						<input
							className={inputClassName}
							type="date"
							value={occurrenceDate}
							disabled={isBusy}
							onChange={event => setOccurrenceDate(event.currentTarget.value)}
						/>
					</Field>
				</div>

				{selectedTemplate !== null && (
					<article className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/35 cf:p-4">
						<strong className="cf:block cf:text-lg cf:font-black cf:text-white">
							{selectedTemplate.name}
						</strong>
						<p className="cf:m-0 cf:mt-1 cf:text-sm cf:leading-6 cf:text-slate-300">
							{selectedTemplate.description || 'No description.'}
						</p>
					</article>
				)}

				<div className="cf:grid cf:gap-4">
					{selectedQuestions.map(question => (
						<QuestionField
							key={question.id}
							question={question}
							value={answers[question.id]}
							disabled={isBusy}
							onChange={value => {
								setAnswers(current => ({
									...current,
									[question.id]: value,
								}));
							}}
						/>
					))}
				</div>

				<div className="cf:flex cf:flex-col cf:gap-3 cf:sm:flex-row cf:sm:items-center">
					<button
						className="cf:w-fit cf:rounded-2xl cf:border cf:border-orange-300/25 cf:bg-gradient-to-br cf:from-orange-500 cf:to-amber-300 cf:px-5 cf:py-3 cf:font-black cf:text-slate-950 cf:shadow-[0_18px_50px_rgba(249,115,22,0.18)] cf:transition cf:hover:brightness-110 cf:disabled:cursor-not-allowed cf:disabled:opacity-60"
						type="submit"
						disabled={isBusy || schedules.length === 0}
					>
						Submit standup
					</button>

					{message !== '' && <p className="cf:m-0 cf:text-sm cf:font-bold cf:text-amber-300">{message}</p>}
				</div>
			</form>
		</section>
	);
}

const inputClassName =
	'cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/55 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:transition cf:[color-scheme:dark] cf:placeholder:text-slate-500 cf:focus:border-orange-300/60 cf:focus:ring-4 cf:focus:ring-orange-300/15 cf:disabled:cursor-not-allowed cf:disabled:opacity-60';

/**
 * Field renders a labeled control shell.
 */
function Field(props: { readonly label: string; readonly children: ReactElement }): ReactElement {
	return (
		<label className="cf:grid cf:gap-2">
			<span className="cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.14em] cf:text-orange-200">
				{props.label}
			</span>
			{props.children}
		</label>
	);
}

/**
 * QuestionField renders one dynamic standup question.
 */
function QuestionField(props: {
	readonly question: StandupQuestion;
	readonly value: AnswerDraftValue | undefined;
	readonly disabled: boolean;
	readonly onChange: (value: AnswerDraftValue) => void;
}): ReactElement {
	const label = props.question.prompt || props.question.label;

	return (
		<div className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/35 cf:p-4">
			<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
				<strong className="cf:text-base cf:font-black cf:text-white">{label}</strong>
				{props.question.required && (
					<span className="cf:rounded-full cf:bg-red-300/10 cf:px-2.5 cf:py-1 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.1em] cf:text-red-200">
						Required
					</span>
				)}
			</div>

			{props.question.helpText !== '' && (
				<p className="cf:m-0 cf:mt-2 cf:text-sm cf:leading-6 cf:text-slate-300">{props.question.helpText}</p>
			)}

			<div className="cf:mt-3">{renderQuestionInput(props)}</div>
		</div>
	);
}

/**
 * renderQuestionInput renders the correct input for a question type.
 */
function renderQuestionInput(props: {
	readonly question: StandupQuestion;
	readonly value: AnswerDraftValue | undefined;
	readonly disabled: boolean;
	readonly onChange: (value: AnswerDraftValue) => void;
}): ReactElement {
	switch (props.question.type) {
		case 'long_text':
			return (
				<textarea
					className={`${inputClassName} cf:min-h-28 cf:resize-y`}
					value={stringValue(props.value)}
					placeholder={props.question.placeholder}
					disabled={props.disabled}
					onChange={event => props.onChange(event.currentTarget.value)}
				/>
			);

		case 'checkbox':
		case 'boolean':
			return (
				<label className="cf:flex cf:items-center cf:gap-3">
					<input
						className="cf:size-4 cf:accent-orange-500"
						type="checkbox"
						checked={booleanValue(props.value)}
						disabled={props.disabled}
						onChange={event => props.onChange(event.currentTarget.checked)}
					/>
					<span className="cf:text-sm cf:font-bold cf:text-slate-200">Yes</span>
				</label>
			);

		case 'dropdown':
			return (
				<select
					className={inputClassName}
					value={stringValue(props.value)}
					disabled={props.disabled}
					onChange={event => props.onChange(event.currentTarget.value)}
				>
					<option value="">Choose…</option>
					{props.question.options.map(option => (
						<option value={option} key={option}>
							{option}
						</option>
					))}
				</select>
			);

		case 'multi_select':
			return (
				<select
					className={`${inputClassName} cf:min-h-28`}
					multiple
					value={arrayValue(props.value)}
					disabled={props.disabled}
					onChange={event =>
						props.onChange(Array.from(event.currentTarget.selectedOptions).map(option => option.value))
					}
				>
					{props.question.options.map(option => (
						<option value={option} key={option}>
							{option}
						</option>
					))}
				</select>
			);

		case 'number':
			return (
				<input
					className={inputClassName}
					type="number"
					value={stringValue(props.value)}
					placeholder={props.question.placeholder}
					disabled={props.disabled}
					onChange={event => props.onChange(event.currentTarget.value)}
				/>
			);

		case 'duration':
		case 'text':
		default:
			return (
				<input
					className={inputClassName}
					type="text"
					value={stringValue(props.value)}
					placeholder={props.question.placeholder}
					disabled={props.disabled}
					onChange={event => props.onChange(event.currentTarget.value)}
				/>
			);
	}
}

/**
 * buildInitialAnswers creates defaults for a list of questions.
 */
function buildInitialAnswers(questions: readonly StandupQuestion[]): AnswerDrafts {
	const defaults: Record<string, AnswerDraftValue> = {};

	for (const question of questions) {
		switch (question.type) {
			case 'checkbox':
			case 'boolean':
				defaults[question.id] = false;
				break;

			case 'multi_select':
				defaults[question.id] = [];
				break;

			default:
				defaults[question.id] = '';
				break;
		}
	}

	return defaults;
}

/**
 * validateRequiredAnswers checks required question answers before submit.
 */
function validateRequiredAnswers(questions: readonly StandupQuestion[], answers: AnswerDrafts): string | null {
	for (const question of questions) {
		if (!question.required) {
			continue;
		}

		const value = answers[question.id];

		if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
			return 'Answer all required standup questions.';
		}
	}

	return null;
}

/**
 * answerValueToJSON serializes an answer according to question type.
 */
function answerValueToJSON(questionType: QuestionType, value: AnswerDraftValue | undefined): string {
	switch (questionType) {
		case 'checkbox':
		case 'boolean':
			return JSON.stringify(booleanValue(value));

		case 'multi_select':
			return JSON.stringify(arrayValue(value));

		case 'number': {
			const parsed = Number(stringValue(value));
			return JSON.stringify(Number.isFinite(parsed) ? parsed : 0);
		}

		default:
			return JSON.stringify(stringValue(value));
	}
}

/**
 * stringValue narrows a draft value to string.
 */
function stringValue(value: AnswerDraftValue | undefined): string {
	return typeof value === 'string' ? value : '';
}

/**
 * booleanValue narrows a draft value to boolean.
 */
function booleanValue(value: AnswerDraftValue | undefined): boolean {
	return typeof value === 'boolean' ? value : false;
}

/**
 * arrayValue narrows a draft value to a string array.
 */
function arrayValue(value: AnswerDraftValue | undefined): readonly string[] {
	return Array.isArray(value) ? value : [];
}

/**
 * getTodayLocalDateString returns today's local YYYY-MM-DD date.
 */
function getTodayLocalDateString(): string {
	const date = new Date();
	const year = String(date.getFullYear());
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
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
