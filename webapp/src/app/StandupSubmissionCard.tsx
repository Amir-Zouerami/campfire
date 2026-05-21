import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { CheckCircle2, ClipboardList, Loader2, Send, TimerReset } from 'lucide-react';
import { toast } from 'sonner';

import { ApiClientError, listMyTasks, listStandupConfiguration, submitStandup } from '@/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { QuestionType, StandupQuestion, StandupSchedule, StandupTemplate, Task, Workspace } from '@/types/domain';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireEmpty,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from './campfire-ui';

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
		 * Loads standup configuration and current-user tasks.
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
				const firstSchedule = enabledSchedules[0] ?? configurationResponse.schedules[0];

				setTemplates(configurationResponse.templates);
				setQuestions(configurationResponse.questions);
				setSchedules(configurationResponse.schedules);
				setTasks(tasksResponse.tasks);

				if (firstSchedule !== undefined) {
					setSelectedScheduleID(firstSchedule.id);
					setAnswers(buildInitialAnswers(configurationResponse.questions, firstSchedule.templateId));
				}

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

	const selectedTemplate = useMemo(() => {
		if (selectedSchedule === null) {
			return null;
		}

		return templates.find(template => template.id === selectedSchedule.templateId) ?? null;
	}, [templates, selectedSchedule]);

	const visibleQuestions = useMemo(() => {
		if (selectedTemplate === null) {
			return [];
		}

		return questions
			.filter(question => question.templateId === selectedTemplate.id)
			.sort((first, second) => first.position - second.position || first.label.localeCompare(second.label));
	}, [questions, selectedTemplate]);

	const activeTasks = useMemo(() => {
		return tasks.filter(task => task.status === 'active' || task.status === 'blocked');
	}, [tasks]);

	const isBusy = loadState === 'loading' || loadState === 'saving';

	/**
	 * Changes selected schedule and rebuilds answers for that template.
	 */
	function handleScheduleChange(scheduleID: string): void {
		const nextSchedule = schedules.find(schedule => schedule.id === scheduleID) ?? null;
		setSelectedScheduleID(scheduleID);

		if (nextSchedule !== null) {
			setAnswers(buildInitialAnswers(questions, nextSchedule.templateId));
		}
	}

	/**
	 * Updates one answer draft.
	 */
	function updateAnswer(questionID: string, value: AnswerDraftValue): void {
		setAnswers(current => ({
			...current,
			[questionID]: value,
		}));
	}

	/**
	 * Submits the current standup response.
	 */
	async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();

		if (selectedSchedule === null || selectedTemplate === null) {
			setMessage('Choose a standup schedule before submitting.');
			setLoadState('error');
			return;
		}

		const validationMessage = validateRequiredAnswers(visibleQuestions, answers);
		if (validationMessage !== null) {
			setMessage(validationMessage);
			setLoadState('error');
			return;
		}

		setLoadState('saving');
		setMessage('');

		try {
			await submitStandup({
				workspaceId: props.workspace.id,
				templateId: selectedTemplate.id,
				scheduleId: selectedSchedule.id,
				occurrenceDate,
				answers: visibleQuestions.map(question => ({
					questionId: question.id,
					valueJson: JSON.stringify(normalizeAnswerValue(question, answers[question.id])),
				})),
			});

			setLoadState('ready');
			setMessage('Standup submitted.');
			toast.success('Standup submitted');
			props.onStandupSubmitted();
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);
			setMessage(errorMessage);
			setLoadState('error');
			toast.error(errorMessage);
		}
	}

	return (
		<CampfirePanel className="cf:overflow-hidden">
			<CampfireCardHeader
				eyebrow="Submit"
				title="My standup"
				description="Answer the current daily or weekly form. Submitting again updates your response without losing first-submitted timing."
				icon={ClipboardList}
				action={
					<CampfireStatusPill tone={selectedSchedule?.kind === 'weekly' ? 'ember' : 'green'}>
						{selectedSchedule === null ? 'No schedule' : formatLabel(selectedSchedule.kind)}
					</CampfireStatusPill>
				}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
				<div className="cf:grid cf:gap-3 cf:md:grid-cols-3">
					<CampfireMetric label="Schedules" value={String(schedules.length)} helper="Configured" />
					<CampfireMetric
						label="Questions"
						value={String(visibleQuestions.length)}
						helper={selectedTemplate?.name ?? 'No template'}
					/>
					<CampfireMetric
						label="Active tasks"
						value={String(activeTasks.length)}
						helper="For context"
						icon={TimerReset}
					/>
				</div>

				{message !== '' && <MessageRow state={loadState} message={message} />}
				{loadState === 'loading' && <LoadingRow label="Loading standup form…" />}

				{loadState !== 'loading' && schedules.length === 0 && (
					<CampfireEmpty
						icon={ClipboardList}
						title="No standup schedules"
						description="Create a daily or weekly schedule in Settings before submitting standups."
					/>
				)}

				{schedules.length > 0 && (
					<form className="cf:grid cf:gap-5" onSubmit={handleSubmit}>
						<div className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4 cf:lg:grid-cols-[1fr_14rem]">
							<FormField label="Schedule" htmlFor="campfire-standup-schedule">
								<select
									id="campfire-standup-schedule"
									className={selectClassName()}
									disabled={isBusy}
									value={selectedScheduleID}
									onChange={event => handleScheduleChange(event.currentTarget.value)}
								>
									{schedules.map(schedule => (
										<option key={schedule.id} value={schedule.id}>
											{formatLabel(schedule.kind)} ·{' '}
											{templateLabel(templates, schedule.templateId)} · {schedule.timeOfDay}
										</option>
									))}
								</select>
							</FormField>

							<FormField label="Occurrence date" htmlFor="campfire-standup-date">
								<Input
									id="campfire-standup-date"
									type="date"
									disabled={isBusy}
									value={occurrenceDate}
									onChange={event => setOccurrenceDate(event.currentTarget.value)}
								/>
							</FormField>
						</div>

						{activeTasks.length > 0 && (
							<div className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-4">
								<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3">
									<div>
										<h3 className="cf:text-lg cf:font-black cf:text-white">Current task context</h3>
										<p className="cf:mt-1 cf:text-sm cf:font-medium cf:text-slate-400">
											Use this as context while writing your update.
										</p>
									</div>
									<Badge variant="secondary" className="cf:rounded-full">
										{activeTasks.length} active
									</Badge>
								</div>

								<div className="cf:mt-4 cf:grid cf:gap-2 cf:lg:grid-cols-2">
									{activeTasks.slice(0, 6).map(task => (
										<div
											className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/45 cf:p-3"
											key={task.id}
										>
											<strong className="cf:block cf:text-sm cf:font-black cf:text-white">
												{task.title}
											</strong>
											<span className="cf:mt-1 cf:block cf:text-xs cf:font-bold cf:text-slate-400">
												{formatLabel(task.status)}
											</span>
										</div>
									))}
								</div>
							</div>
						)}

						<Separator className="cf:bg-white/10" />

						<div className="cf:grid cf:gap-4">
							{visibleQuestions.length === 0 && (
								<CampfireEmpty
									icon={ClipboardList}
									title="No questions in this template"
									description="Choose another schedule or add questions to this template in Settings."
								/>
							)}

							{visibleQuestions.map(question => (
								<QuestionControl
									key={question.id}
									question={question}
									value={answers[question.id] ?? defaultAnswerForType(question.type)}
									disabled={isBusy}
									onChange={value => updateAnswer(question.id, value)}
								/>
							))}
						</div>

						<Button type="submit" size="lg" disabled={isBusy || visibleQuestions.length === 0}>
							{loadState === 'saving' ? (
								<Loader2 className="cf:size-4 cf:animate-spin" />
							) : (
								<Send className="cf:size-4" />
							)}
							Submit standup
						</Button>
					</form>
				)}
			</CampfireCardBody>
		</CampfirePanel>
	);
}

/**
 * QuestionControl renders one dynamic question input.
 */
function QuestionControl(props: {
	readonly question: StandupQuestion;
	readonly value: AnswerDraftValue;
	readonly disabled: boolean;
	readonly onChange: (value: AnswerDraftValue) => void;
}): ReactElement {
	return (
		<div className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-3">
				<div>
					<Label className="cf:text-base cf:font-black cf:text-white">
						{props.question.label}
						{props.question.required && <span className="cf:ml-1 cf:text-amber-200">*</span>}
					</Label>
					{props.question.helpText !== '' && (
						<p className="cf:mt-1 cf:text-sm cf:font-medium cf:leading-6 cf:text-slate-400">
							{props.question.helpText}
						</p>
					)}
				</div>

				<div className="cf:flex cf:flex-wrap cf:gap-2">
					{props.question.isPrivate && <CampfireStatusPill tone="slate">Private</CampfireStatusPill>}
					{props.question.showInReport && <CampfireStatusPill tone="green">Report</CampfireStatusPill>}
				</div>
			</div>

			<div className="cf:mt-4">
				<QuestionInput
					question={props.question}
					value={props.value}
					disabled={props.disabled}
					onChange={props.onChange}
				/>
			</div>
		</div>
	);
}

/**
 * QuestionInput renders the correct control for one question type.
 */
function QuestionInput(props: {
	readonly question: StandupQuestion;
	readonly value: AnswerDraftValue;
	readonly disabled: boolean;
	readonly onChange: (value: AnswerDraftValue) => void;
}): ReactElement {
	switch (props.question.type) {
		case 'long_text':
			return (
				<Textarea
					className="cf:min-h-32"
					disabled={props.disabled}
					placeholder={props.question.placeholder}
					value={stringAnswer(props.value)}
					onChange={event => props.onChange(event.currentTarget.value)}
				/>
			);

		case 'checkbox':
		case 'boolean':
			return (
				<label className="cf:flex cf:cursor-pointer cf:items-center cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-3 cf:text-sm cf:font-bold cf:text-slate-200">
					<Checkbox
						checked={booleanAnswer(props.value)}
						disabled={props.disabled}
						onCheckedChange={checked => props.onChange(checked === true)}
					/>
					Yes
				</label>
			);

		case 'dropdown':
			return (
				<select
					className={selectClassName()}
					disabled={props.disabled}
					value={stringAnswer(props.value)}
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
				<div className="cf:grid cf:gap-2 cf:sm:grid-cols-2">
					{props.question.options.map(option => (
						<label
							className="cf:flex cf:cursor-pointer cf:items-center cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-3 cf:text-sm cf:font-bold cf:text-slate-200"
							key={option}
						>
							<Checkbox
								checked={arrayAnswer(props.value).includes(option)}
								disabled={props.disabled}
								onCheckedChange={checked =>
									props.onChange(toggleOption(arrayAnswer(props.value), option, checked === true))
								}
							/>
							{option}
						</label>
					))}
				</div>
			);

		case 'number':
		case 'duration':
			return (
				<Input
					disabled={props.disabled}
					type="number"
					placeholder={props.question.placeholder}
					value={stringAnswer(props.value)}
					onChange={event => props.onChange(event.currentTarget.value)}
				/>
			);

		case 'text':
		default:
			return (
				<Input
					disabled={props.disabled}
					placeholder={props.question.placeholder}
					value={stringAnswer(props.value)}
					onChange={event => props.onChange(event.currentTarget.value)}
				/>
			);
	}
}

/**
 * FormField renders a labeled field.
 */
function FormField(props: {
	readonly label: string;
	readonly htmlFor: string;
	readonly children: ReactElement;
}): ReactElement {
	return (
		<div className="cf:grid cf:gap-2">
			<Label
				htmlFor={props.htmlFor}
				className="cf:text-xs cf:font-black cf:uppercase cf:tracking-widest cf:text-amber-200"
			>
				{props.label}
			</Label>
			{props.children}
		</div>
	);
}

/**
 * MessageRow renders save/load feedback.
 */
function MessageRow(props: { readonly state: LoadState; readonly message: string }): ReactElement {
	const isError = props.state === 'error';

	return (
		<div
			className={cn(
				'cf:flex cf:items-center cf:gap-2 cf:rounded-2xl cf:border cf:px-4 cf:py-3 cf:text-sm cf:font-black',
				isError
					? 'cf:border-red-300/25 cf:bg-red-950/30 cf:text-red-100'
					: 'cf:border-amber-300/25 cf:bg-amber-950/30 cf:text-amber-100',
			)}
		>
			{isError ? null : <CheckCircle2 className="cf:size-4" />}
			{props.message}
		</div>
	);
}

/**
 * LoadingRow renders a loading message.
 */
function LoadingRow(props: { readonly label: string }): ReactElement {
	return (
		<div className="cf:flex cf:items-center cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-4 cf:text-sm cf:font-bold cf:text-slate-300">
			<Loader2 className="cf:size-4 cf:animate-spin cf:text-amber-200" />
			{props.label}
		</div>
	);
}

/**
 * buildInitialAnswers returns default answer drafts for one template.
 */
function buildInitialAnswers(questions: readonly StandupQuestion[], templateID: string): AnswerDrafts {
	const result: Record<string, AnswerDraftValue> = {};

	for (const question of questions) {
		if (question.templateId === templateID) {
			result[question.id] = defaultAnswerForType(question.type);
		}
	}

	return result;
}

/**
 * defaultAnswerForType returns a safe UI default for one question type.
 */
function defaultAnswerForType(type: QuestionType): AnswerDraftValue {
	if (type === 'checkbox' || type === 'boolean') {
		return false;
	}

	if (type === 'multi_select') {
		return [];
	}

	return '';
}

/**
 * normalizeAnswerValue maps a UI answer draft to the stored JSON value.
 */
function normalizeAnswerValue(
	question: StandupQuestion,
	value: AnswerDraftValue | undefined,
): string | boolean | readonly string[] | number {
	const safeValue = value ?? defaultAnswerForType(question.type);

	if (question.type === 'number' || question.type === 'duration') {
		const parsed = Number.parseInt(stringAnswer(safeValue), 10);

		return Number.isFinite(parsed) ? parsed : 0;
	}

	return safeValue;
}

/**
 * validateRequiredAnswers validates required question drafts.
 */
function validateRequiredAnswers(questions: readonly StandupQuestion[], answers: AnswerDrafts): string | null {
	for (const question of questions) {
		if (!question.required) {
			continue;
		}

		const value = answers[question.id];

		if (question.type === 'checkbox' || question.type === 'boolean') {
			if (value !== true) {
				return `Required question "${question.label}" must be checked.`;
			}

			continue;
		}

		if (question.type === 'multi_select') {
			if (arrayAnswer(value).length === 0) {
				return `Required question "${question.label}" needs at least one option.`;
			}

			continue;
		}

		if (stringAnswer(value).trim() === '') {
			return `Required question "${question.label}" is empty.`;
		}
	}

	return null;
}

/**
 * templateLabel returns the display label for a template ID.
 */
function templateLabel(templates: readonly StandupTemplate[], templateID: string): string {
	return templates.find(template => template.id === templateID)?.name ?? 'Unknown template';
}

/**
 * toggleOption returns a new multi-select value.
 */
function toggleOption(current: readonly string[], option: string, checked: boolean): readonly string[] {
	if (checked) {
		return current.includes(option) ? current : [...current, option];
	}

	return current.filter(value => value !== option);
}

/**
 * stringAnswer narrows an answer draft to string.
 */
function stringAnswer(value: AnswerDraftValue | undefined): string {
	return typeof value === 'string' ? value : '';
}

/**
 * booleanAnswer narrows an answer draft to boolean.
 */
function booleanAnswer(value: AnswerDraftValue | undefined): boolean {
	return typeof value === 'boolean' ? value : false;
}

/**
 * arrayAnswer narrows an answer draft to string array.
 */
function arrayAnswer(value: AnswerDraftValue | undefined): readonly string[] {
	return Array.isArray(value) ? value : [];
}

/**
 * selectClassName returns the shared native select style.
 */
function selectClassName(): string {
	return cn(
		'cf:h-10 cf:w-full cf:rounded-md cf:border cf:border-input cf:bg-background cf:px-3 cf:py-2 cf:text-sm cf:text-foreground cf:outline-none',
		'cf:focus-visible:border-ring cf:focus-visible:ring-ring/50 cf:focus-visible:ring-3',
		'cf:disabled:cursor-not-allowed cf:disabled:opacity-50',
	);
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
