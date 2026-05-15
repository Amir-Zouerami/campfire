import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from 'react';

import {
	ApiClientError,
	createStandupQuestion,
	createStandupTemplate,
	listStandupConfiguration,
	updateStandupQuestion,
	updateStandupTemplate,
} from '../api/client';
import type { StandupQuestion, StandupTemplate, Workspace } from '../types/domain';

/**
 * StandupFormBuilderCardProps contains workspace and permission data.
 */
type StandupFormBuilderCardProps = {
	readonly workspace: Workspace;
	readonly canManageWorkspace: boolean;
	readonly onConfigurationChanged: () => void;
};

/**
 * LoadState describes the form-builder loading status.
 */
type LoadState = 'idle' | 'loading' | 'ready' | 'saving' | 'error';

/**
 * TemplateDraft contains editable template fields.
 */
type TemplateDraft = {
	readonly name: string;
	readonly description: string;
	readonly kind: string;
	readonly isActive: boolean;
};

/**
 * QuestionDraft contains editable question fields.
 */
type QuestionDraft = {
	readonly templateId: string;
	readonly section: string;
	readonly label: string;
	readonly helpText: string;
	readonly placeholder: string;
	readonly type: string;
	readonly required: boolean;
	readonly showInReport: boolean;
	readonly isPrivate: boolean;
	readonly position: string;
	readonly optionsText: string;
};

const standupKinds = ['daily', 'weekly', 'custom'] as const;

const questionTypes = [
	'text',
	'long_text',
	'checkbox',
	'boolean',
	'dropdown',
	'multi_select',
	'number',
	'duration',
] as const;

/**
 * StandupFormBuilderCard lets workspace Leads create and edit templates/questions.
 */
export function StandupFormBuilderCard(props: StandupFormBuilderCardProps): ReactElement {
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [templates, setTemplates] = useState<readonly StandupTemplate[]>([]);
	const [questions, setQuestions] = useState<readonly StandupQuestion[]>([]);
	const [selectedTemplateID, setSelectedTemplateID] = useState('');
	const [newTemplate, setNewTemplate] = useState<TemplateDraft>({
		name: '',
		description: '',
		kind: 'daily',
		isActive: true,
	});
	const [templateDrafts, setTemplateDrafts] = useState<Record<string, TemplateDraft>>({});
	const [newQuestion, setNewQuestion] = useState<QuestionDraft>(emptyQuestionDraft(''));
	const [questionDrafts, setQuestionDrafts] = useState<Record<string, QuestionDraft>>({});
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * Loads current standup form configuration.
		 */
		async function loadConfiguration(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const response = await listStandupConfiguration(props.workspace.id);

				if (!isActive) {
					return;
				}

				const firstTemplate = response.templates[0];
				const nextSelectedTemplateID = selectedTemplateID || firstTemplate?.id || '';

				setTemplates(response.templates);
				setQuestions(response.questions);
				setSelectedTemplateID(nextSelectedTemplateID);
				setTemplateDrafts(buildTemplateDrafts(response.templates));
				setQuestionDrafts(buildQuestionDrafts(response.questions));
				setNewQuestion(emptyQuestionDraft(nextSelectedTemplateID));
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

	const sortedTemplates = useMemo(() => {
		return [...templates].sort((first, second) => first.name.localeCompare(second.name));
	}, [templates]);

	const selectedQuestions = useMemo(() => {
		return questions
			.filter(question => question.templateId === selectedTemplateID)
			.sort((first, second) => first.position - second.position);
	}, [questions, selectedTemplateID]);

	const isBusy = loadState === 'loading' || loadState === 'saving';

	/**
	 * Creates a new template.
	 */
	async function handleCreateTemplate(event: FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();

		if (!props.canManageWorkspace) {
			setMessage('Only workspace Leads and system admins can manage standup forms.');
			return;
		}

		if (newTemplate.name.trim() === '') {
			setMessage('Template name is required.');
			return;
		}

		setLoadState('saving');
		setMessage('');

		try {
			const response = await createStandupTemplate(props.workspace.id, {
				name: newTemplate.name.trim(),
				description: newTemplate.description.trim(),
				kind: newTemplate.kind,
			});

			setTemplates(current => [...current, response.template]);
			setTemplateDrafts(current => ({
				...current,
				[response.template.id]: templateToDraft(response.template),
			}));
			setSelectedTemplateID(response.template.id);
			setNewQuestion(emptyQuestionDraft(response.template.id));
			setNewTemplate({
				name: '',
				description: '',
				kind: 'daily',
				isActive: true,
			});
			setLoadState('ready');
			setMessage('Template created.');
			props.onConfigurationChanged();
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	/**
	 * Saves one existing template.
	 */
	async function handleUpdateTemplate(template: StandupTemplate): Promise<void> {
		const draft = templateDrafts[template.id];
		if (draft === undefined) {
			setMessage('Could not find template draft.');
			return;
		}

		setLoadState('saving');
		setMessage('');

		try {
			const response = await updateStandupTemplate(props.workspace.id, template.id, {
				name: draft.name.trim(),
				description: draft.description.trim(),
				kind: draft.kind,
				isActive: draft.isActive,
			});

			setTemplates(current => replaceTemplate(current, response.template));
			setTemplateDrafts(current => ({
				...current,
				[response.template.id]: templateToDraft(response.template),
			}));
			setLoadState('ready');
			setMessage('Template updated.');
			props.onConfigurationChanged();
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	/**
	 * Creates a new question.
	 */
	async function handleCreateQuestion(event: FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();

		if (!props.canManageWorkspace) {
			setMessage('Only workspace Leads and system admins can manage standup forms.');
			return;
		}

		if (newQuestion.templateId.trim() === '') {
			setMessage('Choose a template before adding a question.');
			return;
		}

		if (newQuestion.label.trim() === '') {
			setMessage('Question label is required.');
			return;
		}

		setLoadState('saving');
		setMessage('');

		try {
			const response = await createStandupQuestion(props.workspace.id, questionDraftToRequest(newQuestion));

			setQuestions(current => [...current, response.question]);
			setQuestionDrafts(current => ({
				...current,
				[response.question.id]: questionToDraft(response.question),
			}));
			setNewQuestion(emptyQuestionDraft(newQuestion.templateId));
			setLoadState('ready');
			setMessage('Question created.');
			props.onConfigurationChanged();
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	/**
	 * Saves one existing question.
	 */
	async function handleUpdateQuestion(question: StandupQuestion): Promise<void> {
		const draft = questionDrafts[question.id];
		if (draft === undefined) {
			setMessage('Could not find question draft.');
			return;
		}

		setLoadState('saving');
		setMessage('');

		try {
			const response = await updateStandupQuestion(
				props.workspace.id,
				question.id,
				questionDraftToRequest(draft),
			);

			setQuestions(current => replaceQuestion(current, response.question));
			setQuestionDrafts(current => ({
				...current,
				[response.question.id]: questionToDraft(response.question),
			}));
			setLoadState('ready');
			setMessage('Question updated.');
			props.onConfigurationChanged();
		} catch (error: unknown) {
			setMessage(errorToMessage(error));
			setLoadState('error');
		}
	}

	return (
		<section className="cf:mt-5 cf:rounded-3xl cf:border cf:border-rose-300/20 cf:bg-white/[0.055] cf:p-6 cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
			<div className="cf:grid cf:gap-5 cf:lg:grid-cols-[1fr_auto] cf:lg:items-start">
				<div>
					<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-rose-200">
						Form builder
					</p>
					<h2 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
						Standup form builder
					</h2>
					<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">
						Create templates and manage dynamic questions. For MVP, deleting is intentionally omitted to
						protect historical submissions.
					</p>
				</div>

				<div className="cf:w-fit cf:rounded-full cf:border cf:border-rose-300/25 cf:bg-rose-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-rose-200">
					{templates.length} templates
				</div>
			</div>

			{!props.canManageWorkspace && (
				<p className="cf:m-0 cf:mt-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-3 cf:text-sm cf:leading-6 cf:text-slate-300">
					You can view forms, but only workspace Leads and system admins can change them.
				</p>
			)}

			{message !== '' && <p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-bold cf:text-amber-300">{message}</p>}

			<form
				className="cf:mt-5 cf:grid cf:gap-3 cf:lg:grid-cols-[1fr_1fr_180px_auto]"
				onSubmit={event => void handleCreateTemplate(event)}
			>
				<input
					className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:placeholder:text-slate-500"
					disabled={isBusy || !props.canManageWorkspace}
					placeholder="New template name"
					value={newTemplate.name}
					onChange={event => setNewTemplate(current => ({ ...current, name: event.currentTarget.value }))}
				/>
				<input
					className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:placeholder:text-slate-500"
					disabled={isBusy || !props.canManageWorkspace}
					placeholder="Description"
					value={newTemplate.description}
					onChange={event =>
						setNewTemplate(current => ({ ...current, description: event.currentTarget.value }))
					}
				/>
				<select
					className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:px-4 cf:py-3 cf:text-white cf:outline-none"
					disabled={isBusy || !props.canManageWorkspace}
					value={newTemplate.kind}
					onChange={event => setNewTemplate(current => ({ ...current, kind: event.currentTarget.value }))}
				>
					{standupKinds.map(kind => (
						<option key={kind} value={kind}>
							{formatLabel(kind)}
						</option>
					))}
				</select>
				<button
					className="cf:rounded-2xl cf:border cf:border-rose-300/30 cf:bg-rose-400/20 cf:px-5 cf:py-3 cf:font-black cf:text-rose-50"
					disabled={isBusy || !props.canManageWorkspace}
					type="submit"
				>
					Create template
				</button>
			</form>

			<div className="cf:mt-5 cf:grid cf:gap-3">
				{sortedTemplates.map(template => {
					const draft = templateDrafts[template.id];
					if (draft === undefined) {
						return null;
					}

					return (
						<article
							className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4"
							key={template.id}
						>
							<div className="cf:grid cf:gap-3 cf:lg:grid-cols-[1fr_1fr_160px_120px_auto]">
								<input
									className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white"
									disabled={isBusy || !props.canManageWorkspace}
									value={draft.name}
									onChange={event =>
										updateTemplateDraft(template.id, { name: event.currentTarget.value })
									}
								/>
								<input
									className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white"
									disabled={isBusy || !props.canManageWorkspace}
									value={draft.description}
									onChange={event =>
										updateTemplateDraft(template.id, { description: event.currentTarget.value })
									}
								/>
								<select
									className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white"
									disabled={isBusy || !props.canManageWorkspace}
									value={draft.kind}
									onChange={event =>
										updateTemplateDraft(template.id, { kind: event.currentTarget.value })
									}
								>
									{standupKinds.map(kind => (
										<option key={kind} value={kind}>
											{formatLabel(kind)}
										</option>
									))}
								</select>
								<label className="cf:flex cf:items-center cf:gap-2 cf:text-sm cf:font-bold cf:text-slate-200">
									<input
										checked={draft.isActive}
										disabled={isBusy || !props.canManageWorkspace}
										type="checkbox"
										onChange={event =>
											updateTemplateDraft(template.id, { isActive: event.currentTarget.checked })
										}
									/>
									Active
								</label>
								<button
									className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.06] cf:px-4 cf:py-3 cf:font-black cf:text-white"
									disabled={isBusy || !props.canManageWorkspace}
									type="button"
									onClick={() => void handleUpdateTemplate(template)}
								>
									Save
								</button>
							</div>
							<button
								className="cf:mt-3 cf:text-sm cf:font-black cf:text-rose-200"
								type="button"
								onClick={() => {
									setSelectedTemplateID(template.id);
									setNewQuestion(emptyQuestionDraft(template.id));
								}}
							>
								Edit questions
							</button>
						</article>
					);

					function updateTemplateDraft(templateID: string, patch: Partial<TemplateDraft>): void {
						setTemplateDrafts(current => ({
							...current,
							[templateID]: {
								...current[templateID],
								...patch,
							} as TemplateDraft,
						}));
					}
				})}
			</div>

			<div className="cf:mt-6 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/30 cf:p-4">
				<h3 className="cf:m-0 cf:text-lg cf:font-black cf:text-white">Questions</h3>

				<form className="cf:mt-4 cf:grid cf:gap-3" onSubmit={event => void handleCreateQuestion(event)}>
					<div className="cf:grid cf:gap-3 cf:lg:grid-cols-[1fr_1fr_160px_120px]">
						<select
							className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white"
							disabled={isBusy || !props.canManageWorkspace}
							value={newQuestion.templateId}
							onChange={event =>
								setNewQuestion(current => ({ ...current, templateId: event.currentTarget.value }))
							}
						>
							<option value="">Choose template</option>
							{sortedTemplates.map(template => (
								<option key={template.id} value={template.id}>
									{template.name}
								</option>
							))}
						</select>
						<input
							className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white"
							disabled={isBusy || !props.canManageWorkspace}
							placeholder="Question label"
							value={newQuestion.label}
							onChange={event =>
								setNewQuestion(current => ({ ...current, label: event.currentTarget.value }))
							}
						/>
						<select
							className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white"
							disabled={isBusy || !props.canManageWorkspace}
							value={newQuestion.type}
							onChange={event =>
								setNewQuestion(current => ({ ...current, type: event.currentTarget.value }))
							}
						>
							{questionTypes.map(type => (
								<option key={type} value={type}>
									{formatLabel(type)}
								</option>
							))}
						</select>
						<input
							className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white"
							disabled={isBusy || !props.canManageWorkspace}
							placeholder="Position"
							type="number"
							value={newQuestion.position}
							onChange={event =>
								setNewQuestion(current => ({ ...current, position: event.currentTarget.value }))
							}
						/>
					</div>

					<textarea
						className="cf:min-h-20 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white"
						disabled={isBusy || !props.canManageWorkspace}
						placeholder="Options, one per line for checkbox/dropdown/multi-select"
						value={newQuestion.optionsText}
						onChange={event =>
							setNewQuestion(current => ({ ...current, optionsText: event.currentTarget.value }))
						}
					/>

					<div className="cf:flex cf:flex-wrap cf:gap-4 cf:text-sm cf:font-bold cf:text-slate-200">
						<label>
							<input
								checked={newQuestion.required}
								disabled={isBusy || !props.canManageWorkspace}
								type="checkbox"
								onChange={event =>
									setNewQuestion(current => ({ ...current, required: event.currentTarget.checked }))
								}
							/>{' '}
							Required
						</label>
						<label>
							<input
								checked={newQuestion.showInReport}
								disabled={isBusy || !props.canManageWorkspace}
								type="checkbox"
								onChange={event =>
									setNewQuestion(current => ({
										...current,
										showInReport: event.currentTarget.checked,
									}))
								}
							/>{' '}
							Show in report
						</label>
						<label>
							<input
								checked={newQuestion.isPrivate}
								disabled={isBusy || !props.canManageWorkspace}
								type="checkbox"
								onChange={event =>
									setNewQuestion(current => ({ ...current, isPrivate: event.currentTarget.checked }))
								}
							/>{' '}
							Private
						</label>
					</div>

					<button
						className="cf:w-fit cf:rounded-2xl cf:border cf:border-rose-300/30 cf:bg-rose-400/20 cf:px-5 cf:py-3 cf:font-black cf:text-rose-50"
						disabled={isBusy || !props.canManageWorkspace}
						type="submit"
					>
						Add question
					</button>
				</form>

				<div className="cf:mt-5 cf:grid cf:gap-3">
					{selectedQuestions.map(question => {
						const draft = questionDrafts[question.id];
						if (draft === undefined) {
							return null;
						}

						return (
							<QuestionEditor
								key={question.id}
								disabled={isBusy || !props.canManageWorkspace}
								draft={draft}
								templates={sortedTemplates}
								onChange={patch =>
									setQuestionDrafts(current => ({
										...current,
										[question.id]: {
											...current[question.id],
											...patch,
										} as QuestionDraft,
									}))
								}
								onSave={() => void handleUpdateQuestion(question)}
							/>
						);
					})}
				</div>
			</div>
		</section>
	);
}

/**
 * QuestionEditor renders an editable existing question.
 */
function QuestionEditor(props: {
	readonly disabled: boolean;
	readonly draft: QuestionDraft;
	readonly templates: readonly StandupTemplate[];
	readonly onChange: (patch: Partial<QuestionDraft>) => void;
	readonly onSave: () => void;
}): ReactElement {
	return (
		<article className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.04] cf:p-3">
			<div className="cf:grid cf:gap-3 cf:lg:grid-cols-[1fr_1fr_160px_120px_auto]">
				<select
					className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-3 cf:py-2 cf:text-white"
					disabled={props.disabled}
					value={props.draft.templateId}
					onChange={event => props.onChange({ templateId: event.currentTarget.value })}
				>
					{props.templates.map(template => (
						<option key={template.id} value={template.id}>
							{template.name}
						</option>
					))}
				</select>
				<input
					className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-3 cf:py-2 cf:text-white"
					disabled={props.disabled}
					value={props.draft.label}
					onChange={event => props.onChange({ label: event.currentTarget.value })}
				/>
				<select
					className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-3 cf:py-2 cf:text-white"
					disabled={props.disabled}
					value={props.draft.type}
					onChange={event => props.onChange({ type: event.currentTarget.value })}
				>
					{questionTypes.map(type => (
						<option key={type} value={type}>
							{formatLabel(type)}
						</option>
					))}
				</select>
				<input
					className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-3 cf:py-2 cf:text-white"
					disabled={props.disabled}
					type="number"
					value={props.draft.position}
					onChange={event => props.onChange({ position: event.currentTarget.value })}
				/>
				<button
					className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.06] cf:px-4 cf:py-2 cf:font-black cf:text-white"
					disabled={props.disabled}
					type="button"
					onClick={props.onSave}
				>
					Save
				</button>
			</div>

			<textarea
				className="cf:mt-3 cf:min-h-16 cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-3 cf:py-2 cf:text-white"
				disabled={props.disabled}
				value={props.draft.optionsText}
				onChange={event => props.onChange({ optionsText: event.currentTarget.value })}
			/>

			<div className="cf:mt-3 cf:flex cf:flex-wrap cf:gap-4 cf:text-sm cf:font-bold cf:text-slate-200">
				<label>
					<input
						checked={props.draft.required}
						disabled={props.disabled}
						type="checkbox"
						onChange={event => props.onChange({ required: event.currentTarget.checked })}
					/>{' '}
					Required
				</label>
				<label>
					<input
						checked={props.draft.showInReport}
						disabled={props.disabled}
						type="checkbox"
						onChange={event => props.onChange({ showInReport: event.currentTarget.checked })}
					/>{' '}
					Show in report
				</label>
				<label>
					<input
						checked={props.draft.isPrivate}
						disabled={props.disabled}
						type="checkbox"
						onChange={event => props.onChange({ isPrivate: event.currentTarget.checked })}
					/>{' '}
					Private
				</label>
			</div>
		</article>
	);
}

/**
 * emptyQuestionDraft returns a blank question draft.
 */
function emptyQuestionDraft(templateId: string): QuestionDraft {
	return {
		templateId,
		section: '',
		label: '',
		helpText: '',
		placeholder: '',
		type: 'text',
		required: true,
		showInReport: true,
		isPrivate: false,
		position: '0',
		optionsText: '',
	};
}

/**
 * buildTemplateDrafts maps templates to editable drafts.
 */
function buildTemplateDrafts(templates: readonly StandupTemplate[]): Record<string, TemplateDraft> {
	const drafts: Record<string, TemplateDraft> = {};

	for (const template of templates) {
		drafts[template.id] = templateToDraft(template);
	}

	return drafts;
}

/**
 * templateToDraft maps one template to an editable draft.
 */
function templateToDraft(template: StandupTemplate): TemplateDraft {
	return {
		name: template.name,
		description: template.description,
		kind: template.kind,
		isActive: template.isActive,
	};
}

/**
 * buildQuestionDrafts maps questions to editable drafts.
 */
function buildQuestionDrafts(questions: readonly StandupQuestion[]): Record<string, QuestionDraft> {
	const drafts: Record<string, QuestionDraft> = {};

	for (const question of questions) {
		drafts[question.id] = questionToDraft(question);
	}

	return drafts;
}

/**
 * questionToDraft maps one question to an editable draft.
 */
function questionToDraft(question: StandupQuestion): QuestionDraft {
	return {
		templateId: question.templateId,
		section: question.section,
		label: question.label,
		helpText: question.helpText,
		placeholder: question.placeholder,
		type: question.type,
		required: question.required,
		showInReport: question.showInReport,
		isPrivate: question.isPrivate,
		position: String(question.position),
		optionsText: question.options.join('\n'),
	};
}

/**
 * questionDraftToRequest maps a question draft to API request data.
 */
function questionDraftToRequest(draft: QuestionDraft) {
	return {
		templateId: draft.templateId,
		section: draft.section.trim(),
		label: draft.label.trim(),
		helpText: draft.helpText.trim(),
		placeholder: draft.placeholder.trim(),
		type: draft.type,
		required: draft.required,
		showInReport: draft.showInReport,
		isPrivate: draft.isPrivate,
		position: Number.parseInt(draft.position, 10) || 0,
		options: draft.optionsText
			.split('\n')
			.map(option => option.trim())
			.filter(option => option !== ''),
	};
}

/**
 * replaceTemplate replaces one template in a readonly list.
 */
function replaceTemplate(
	templates: readonly StandupTemplate[],
	updatedTemplate: StandupTemplate,
): readonly StandupTemplate[] {
	return templates.map(template => (template.id === updatedTemplate.id ? updatedTemplate : template));
}

/**
 * replaceQuestion replaces one question in a readonly list.
 */
function replaceQuestion(
	questions: readonly StandupQuestion[],
	updatedQuestion: StandupQuestion,
): readonly StandupQuestion[] {
	return questions.map(question => (question.id === updatedQuestion.id ? updatedQuestion : question));
}

/**
 * formatLabel converts enum-like strings to readable labels.
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

	return 'Could not update standup forms.';
}
