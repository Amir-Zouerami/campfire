import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { CheckCircle2, FileQuestion, Loader2, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';

import {
	ApiClientError,
	createStandupQuestion,
	createStandupTemplate,
	listStandupConfiguration,
	updateStandupQuestion,
	updateStandupTemplate,
} from '@/api';
import type { CreateStandupQuestionRequest } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { QuestionType, StandupKind, StandupQuestion, StandupTemplate, Workspace } from '@/types/domain';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireEmpty,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from './campfire-ui';

/**
 * StandupFormBuilderCardProps contains workspace and permission data.
 */
type StandupFormBuilderCardProps = {
	readonly workspace: Workspace;
	readonly canManageWorkspace: boolean;
	readonly onConfigurationChanged: () => void;
};

/**
 * LoadState describes standup form builder state.
 */
type LoadState = 'idle' | 'loading' | 'ready' | 'saving' | 'error';

/**
 * TemplateDraft contains editable template fields.
 */
type TemplateDraft = {
	readonly name: string;
	readonly description: string;
	readonly kind: StandupKind;
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
	readonly type: QuestionType;
	readonly required: boolean;
	readonly showInReport: boolean;
	readonly isPrivate: boolean;
	readonly position: number;
	readonly optionsText: string;
};

/**
 * TemplateDraftsByID stores editable template drafts by template ID.
 */
type TemplateDraftsByID = Record<string, TemplateDraft>;

/**
 * QuestionDraftsByID stores editable question drafts by question ID.
 */
type QuestionDraftsByID = Record<string, QuestionDraft>;

const questionTypes: readonly QuestionType[] = [
	'text',
	'long_text',
	'checkbox',
	'boolean',
	'dropdown',
	'multi_select',
	'number',
	'duration',
];

const standupKinds: readonly StandupKind[] = ['daily', 'weekly', 'custom'];

/**
 * StandupFormBuilderCard lets workspace leads manage dynamic standup forms.
 */
export function StandupFormBuilderCard(props: StandupFormBuilderCardProps): ReactElement {
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [templates, setTemplates] = useState<readonly StandupTemplate[]>([]);
	const [questions, setQuestions] = useState<readonly StandupQuestion[]>([]);
	const [templateDrafts, setTemplateDrafts] = useState<TemplateDraftsByID>({});
	const [questionDrafts, setQuestionDrafts] = useState<QuestionDraftsByID>({});
	const [savingID, setSavingID] = useState('');
	const [newTemplate, setNewTemplate] = useState<TemplateDraft>(emptyTemplateDraft());
	const [newQuestion, setNewQuestion] = useState<QuestionDraft>(emptyQuestionDraft());
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * Loads standup templates and questions.
		 */
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
				setTemplateDrafts(buildTemplateDrafts(response.templates));
				setQuestionDrafts(buildQuestionDrafts(response.questions));
				setNewQuestion(current => ({
					...current,
					templateId:
						current.templateId.trim() !== '' ? current.templateId : (response.templates[0]?.id ?? ''),
				}));
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

	const sortedTemplates = useMemo(() => sortTemplates(templates), [templates]);
	const sortedQuestions = useMemo(() => sortQuestions(questions), [questions]);
	const activeTemplateCount = useMemo(() => templates.filter(template => template.isActive).length, [templates]);
	const visibleReportQuestionCount = useMemo(
		() => questions.filter(question => question.showInReport).length,
		[questions],
	);
	const isBusy = loadState === 'loading' || loadState === 'saving';

	/**
	 * Creates a new standup template.
	 */
	async function handleCreateTemplate(event: FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();

		if (!props.canManageWorkspace) {
			setLoadState('error');
			setMessage('Only workspace Leads and system admins can manage standup forms.');
			return;
		}

		if (newTemplate.name.trim() === '') {
			setLoadState('error');
			setMessage('Template name is required.');
			return;
		}

		setLoadState('saving');
		setSavingID('new-template');
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
			setNewTemplate(emptyTemplateDraft());
			setNewQuestion(current => ({
				...current,
				templateId: current.templateId.trim() !== '' ? current.templateId : response.template.id,
			}));
			setLoadState('ready');
			setSavingID('');
			setMessage('Standup template created.');
			toast.success('Standup template created');
			props.onConfigurationChanged();
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);
			setMessage(errorMessage);
			setLoadState('error');
			setSavingID('');
			toast.error(errorMessage);
		}
	}

	/**
	 * Updates an existing standup template.
	 */
	async function handleUpdateTemplate(template: StandupTemplate): Promise<void> {
		if (!props.canManageWorkspace) {
			setLoadState('error');
			setMessage('Only workspace Leads and system admins can manage standup forms.');
			return;
		}

		const draft = templateDrafts[template.id];
		if (draft === undefined) {
			setLoadState('error');
			setMessage('Template draft was not found.');
			return;
		}

		if (draft.name.trim() === '') {
			setLoadState('error');
			setMessage('Template name is required.');
			return;
		}

		setLoadState('saving');
		setSavingID(template.id);
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
			setSavingID('');
			setMessage('Standup template updated.');
			toast.success('Standup template updated');
			props.onConfigurationChanged();
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);
			setMessage(errorMessage);
			setLoadState('error');
			setSavingID('');
			toast.error(errorMessage);
		}
	}

	/**
	 * Creates a new standup question.
	 */
	async function handleCreateQuestion(event: FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();

		if (!props.canManageWorkspace) {
			setLoadState('error');
			setMessage('Only workspace Leads and system admins can manage standup forms.');
			return;
		}

		const validationMessage = validateQuestionDraft(newQuestion);
		if (validationMessage !== null) {
			setLoadState('error');
			setMessage(validationMessage);
			return;
		}

		setLoadState('saving');
		setSavingID('new-question');
		setMessage('');

		try {
			const response = await createStandupQuestion(props.workspace.id, questionDraftToRequest(newQuestion));

			setQuestions(current => [...current, response.question]);
			setQuestionDrafts(current => ({
				...current,
				[response.question.id]: questionToDraft(response.question),
			}));
			setNewQuestion(current => ({
				...emptyQuestionDraft(),
				templateId: current.templateId,
				position: current.position + 1,
			}));
			setLoadState('ready');
			setSavingID('');
			setMessage('Standup question created.');
			toast.success('Standup question created');
			props.onConfigurationChanged();
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);
			setMessage(errorMessage);
			setLoadState('error');
			setSavingID('');
			toast.error(errorMessage);
		}
	}

	/**
	 * Updates an existing standup question.
	 */
	async function handleUpdateQuestion(question: StandupQuestion): Promise<void> {
		if (!props.canManageWorkspace) {
			setLoadState('error');
			setMessage('Only workspace Leads and system admins can manage standup forms.');
			return;
		}

		const draft = questionDrafts[question.id];
		if (draft === undefined) {
			setLoadState('error');
			setMessage('Question draft was not found.');
			return;
		}

		const validationMessage = validateQuestionDraft(draft);
		if (validationMessage !== null) {
			setLoadState('error');
			setMessage(validationMessage);
			return;
		}

		setLoadState('saving');
		setSavingID(question.id);
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
			setSavingID('');
			setMessage('Standup question updated.');
			toast.success('Standup question updated');
			props.onConfigurationChanged();
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error);
			setMessage(errorMessage);
			setLoadState('error');
			setSavingID('');
			toast.error(errorMessage);
		}
	}

	/**
	 * Updates a template draft.
	 */
	function updateTemplateDraft(templateID: string, patch: Partial<TemplateDraft>): void {
		setTemplateDrafts(current => {
			const draft = current[templateID];
			if (draft === undefined) {
				return current;
			}

			return {
				...current,
				[templateID]: {
					...draft,
					...patch,
				},
			};
		});
	}

	/**
	 * Updates a question draft.
	 */
	function updateQuestionDraft(questionID: string, patch: Partial<QuestionDraft>): void {
		setQuestionDrafts(current => {
			const draft = current[questionID];
			if (draft === undefined) {
				return current;
			}

			return {
				...current,
				[questionID]: {
					...draft,
					...patch,
				},
			};
		});
	}

	return (
		<CampfirePanel className="cf:overflow-hidden">
			<CampfireCardHeader
				eyebrow="Form builder"
				title="Standup form builder"
				description="Create and edit daily, weekly, and custom standup templates with dynamic questions."
				icon={FileQuestion}
				action={
					<CampfireStatusPill tone={props.canManageWorkspace ? 'green' : 'slate'}>
						{props.canManageWorkspace ? 'Editable' : 'Read only'}
					</CampfireStatusPill>
				}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
				<div className="cf:grid cf:gap-3 cf:md:grid-cols-4">
					<CampfireMetric
						label="Templates"
						value={String(templates.length)}
						helper={`${activeTemplateCount} active`}
					/>
					<CampfireMetric label="Questions" value={String(questions.length)} helper="All templates" />
					<CampfireMetric
						label="Report-visible"
						value={String(visibleReportQuestionCount)}
						helper="Shown in reports"
					/>
					<CampfireMetric label="Workspace" value={props.workspace.name} helper="Current channel" />
				</div>

				{message !== '' && <MessageRow state={loadState} message={message} />}
				{loadState === 'loading' && <LoadingRow label="Loading standup form configuration…" />}

				{!props.canManageWorkspace && (
					<MessageRow state="error" message="You can view forms, but you cannot edit them." />
				)}

				<CreateTemplateForm
					draft={newTemplate}
					disabled={isBusy || !props.canManageWorkspace}
					saving={savingID === 'new-template'}
					onChange={patch => setNewTemplate(current => ({ ...current, ...patch }))}
					onSubmit={handleCreateTemplate}
				/>

				<Separator className="cf:bg-white/10" />

				{sortedTemplates.length === 0 && loadState !== 'loading' && (
					<CampfireEmpty
						icon={FileQuestion}
						title="No templates yet"
						description="Create a daily or weekly template before adding questions."
					/>
				)}

				<div className="cf:grid cf:gap-4">
					{sortedTemplates.map(template => (
						<TemplateCard
							key={template.id}
							template={template}
							draft={templateDrafts[template.id] ?? templateToDraft(template)}
							disabled={isBusy || !props.canManageWorkspace}
							saving={savingID === template.id}
							onChange={patch => updateTemplateDraft(template.id, patch)}
							onSave={() => void handleUpdateTemplate(template)}
						/>
					))}
				</div>

				<Separator className="cf:bg-white/10" />

				<CreateQuestionForm
					templates={sortedTemplates}
					draft={newQuestion}
					disabled={isBusy || !props.canManageWorkspace || sortedTemplates.length === 0}
					saving={savingID === 'new-question'}
					onChange={patch => setNewQuestion(current => ({ ...current, ...patch }))}
					onSubmit={handleCreateQuestion}
				/>

				<div className="cf:grid cf:gap-4">
					{sortedQuestions.map(question => (
						<QuestionCard
							key={question.id}
							question={question}
							templates={sortedTemplates}
							draft={questionDrafts[question.id] ?? questionToDraft(question)}
							disabled={isBusy || !props.canManageWorkspace}
							saving={savingID === question.id}
							onChange={patch => updateQuestionDraft(question.id, patch)}
							onSave={() => void handleUpdateQuestion(question)}
						/>
					))}
				</div>
			</CampfireCardBody>
		</CampfirePanel>
	);
}

/**
 * CreateTemplateForm renders the new-template form.
 */
function CreateTemplateForm(props: {
	readonly draft: TemplateDraft;
	readonly disabled: boolean;
	readonly saving: boolean;
	readonly onChange: (patch: Partial<TemplateDraft>) => void;
	readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}): ReactElement {
	return (
		<form
			className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4"
			onSubmit={props.onSubmit}
		>
			<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3">
				<h3 className="cf:text-lg cf:font-black cf:text-white">Create template</h3>
				<CampfireStatusPill tone="ember">New</CampfireStatusPill>
			</div>

			<div className="cf:grid cf:gap-4 cf:lg:grid-cols-[1fr_14rem]">
				<FormField label="Name" htmlFor="campfire-new-template-name">
					<Input
						id="campfire-new-template-name"
						disabled={props.disabled}
						value={props.draft.name}
						onChange={event => props.onChange({ name: event.currentTarget.value })}
					/>
				</FormField>

				<FormField label="Kind" htmlFor="campfire-new-template-kind">
					<select
						id="campfire-new-template-kind"
						className={selectClassName()}
						disabled={props.disabled}
						value={props.draft.kind}
						onChange={event => props.onChange({ kind: toStandupKind(event.currentTarget.value) })}
					>
						{standupKinds.map(kind => (
							<option key={kind} value={kind}>
								{formatLabel(kind)}
							</option>
						))}
					</select>
				</FormField>
			</div>

			<FormField label="Description" htmlFor="campfire-new-template-description">
				<Textarea
					id="campfire-new-template-description"
					className="cf:min-h-28"
					disabled={props.disabled}
					value={props.draft.description}
					onChange={event => props.onChange({ description: event.currentTarget.value })}
				/>
			</FormField>

			<Button type="submit" disabled={props.disabled}>
				{props.saving ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Plus className="cf:size-4" />}
				Create template
			</Button>
		</form>
	);
}

/**
 * TemplateCard renders one editable template.
 */
function TemplateCard(props: {
	readonly template: StandupTemplate;
	readonly draft: TemplateDraft;
	readonly disabled: boolean;
	readonly saving: boolean;
	readonly onChange: (patch: Partial<TemplateDraft>) => void;
	readonly onSave: () => void;
}): ReactElement {
	return (
		<article className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:flex cf:flex-col cf:gap-4 cf:lg:flex-row cf:lg:items-start cf:lg:justify-between">
				<div>
					<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
						<strong className="cf:text-xl cf:font-black cf:text-white">{props.template.name}</strong>
						<CampfireStatusPill tone={props.template.isActive ? 'green' : 'slate'}>
							{props.template.isActive ? 'Active' : 'Inactive'}
						</CampfireStatusPill>
						<CampfireStatusPill tone="ember">{formatLabel(props.template.kind)}</CampfireStatusPill>
					</div>
					<p className="cf:mt-2 cf:text-xs cf:font-bold cf:text-slate-500">
						Updated {formatDateTime(props.template.updatedAt)}
					</p>
				</div>

				<Button type="button" disabled={props.disabled} onClick={props.onSave}>
					{props.saving ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Save className="cf:size-4" />}
					Save template
				</Button>
			</div>

			<Separator className="cf:my-4 cf:bg-white/10" />

			<div className="cf:grid cf:gap-4">
				<div className="cf:grid cf:gap-4 cf:lg:grid-cols-[1fr_14rem]">
					<FormField label="Name" htmlFor={`campfire-template-name-${props.template.id}`}>
						<Input
							id={`campfire-template-name-${props.template.id}`}
							disabled={props.disabled}
							value={props.draft.name}
							onChange={event => props.onChange({ name: event.currentTarget.value })}
						/>
					</FormField>

					<FormField label="Kind" htmlFor={`campfire-template-kind-${props.template.id}`}>
						<select
							id={`campfire-template-kind-${props.template.id}`}
							className={selectClassName()}
							disabled={props.disabled}
							value={props.draft.kind}
							onChange={event => props.onChange({ kind: toStandupKind(event.currentTarget.value) })}
						>
							{standupKinds.map(kind => (
								<option key={kind} value={kind}>
									{formatLabel(kind)}
								</option>
							))}
						</select>
					</FormField>
				</div>

				<FormField label="Description" htmlFor={`campfire-template-description-${props.template.id}`}>
					<Textarea
						id={`campfire-template-description-${props.template.id}`}
						className="cf:min-h-28"
						disabled={props.disabled}
						value={props.draft.description}
						onChange={event => props.onChange({ description: event.currentTarget.value })}
					/>
				</FormField>

				<BooleanOption
					title="Template active"
					description="Inactive templates stay saved but should not be used for new schedules."
					checked={props.draft.isActive}
					disabled={props.disabled}
					onChange={checked => props.onChange({ isActive: checked })}
				/>
			</div>
		</article>
	);
}

/**
 * CreateQuestionForm renders the new-question form.
 */
function CreateQuestionForm(props: {
	readonly templates: readonly StandupTemplate[];
	readonly draft: QuestionDraft;
	readonly disabled: boolean;
	readonly saving: boolean;
	readonly onChange: (patch: Partial<QuestionDraft>) => void;
	readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}): ReactElement {
	return (
		<form
			className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4"
			onSubmit={props.onSubmit}
		>
			<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3">
				<h3 className="cf:text-lg cf:font-black cf:text-white">Create question</h3>
				<CampfireStatusPill tone="ember">Dynamic</CampfireStatusPill>
			</div>

			<QuestionFields
				idPrefix="campfire-new-question"
				templates={props.templates}
				draft={props.draft}
				disabled={props.disabled}
				onChange={props.onChange}
			/>

			<Button type="submit" disabled={props.disabled}>
				{props.saving ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Plus className="cf:size-4" />}
				Create question
			</Button>
		</form>
	);
}

/**
 * QuestionCard renders one editable question.
 */
function QuestionCard(props: {
	readonly question: StandupQuestion;
	readonly templates: readonly StandupTemplate[];
	readonly draft: QuestionDraft;
	readonly disabled: boolean;
	readonly saving: boolean;
	readonly onChange: (patch: Partial<QuestionDraft>) => void;
	readonly onSave: () => void;
}): ReactElement {
	return (
		<article className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:flex cf:flex-col cf:gap-4 cf:lg:flex-row cf:lg:items-start cf:lg:justify-between">
				<div>
					<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
						<strong className="cf:text-lg cf:font-black cf:text-white">{props.question.label}</strong>
						<CampfireStatusPill tone="slate">{formatLabel(props.question.type)}</CampfireStatusPill>
						{props.question.required && <CampfireStatusPill tone="ember">Required</CampfireStatusPill>}
						{props.question.showInReport && <CampfireStatusPill tone="green">Report</CampfireStatusPill>}
					</div>
					<p className="cf:mt-2 cf:text-xs cf:font-bold cf:text-slate-500">
						Position {props.question.position} · Updated {formatDateTime(props.question.updatedAt)}
					</p>
				</div>

				<Button type="button" disabled={props.disabled} onClick={props.onSave}>
					{props.saving ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Save className="cf:size-4" />}
					Save question
				</Button>
			</div>

			<Separator className="cf:my-4 cf:bg-white/10" />

			<QuestionFields
				idPrefix={`campfire-question-${props.question.id}`}
				templates={props.templates}
				draft={props.draft}
				disabled={props.disabled}
				onChange={props.onChange}
			/>
		</article>
	);
}

/**
 * QuestionFields renders shared question fields.
 */
function QuestionFields(props: {
	readonly idPrefix: string;
	readonly templates: readonly StandupTemplate[];
	readonly draft: QuestionDraft;
	readonly disabled: boolean;
	readonly onChange: (patch: Partial<QuestionDraft>) => void;
}): ReactElement {
	const needsOptions = props.draft.type === 'dropdown' || props.draft.type === 'multi_select';

	return (
		<div className="cf:grid cf:gap-4">
			<div className="cf:grid cf:gap-4 cf:lg:grid-cols-[1fr_14rem_12rem]">
				<FormField label="Template" htmlFor={`${props.idPrefix}-template`}>
					<select
						id={`${props.idPrefix}-template`}
						className={selectClassName()}
						disabled={props.disabled}
						value={props.draft.templateId}
						onChange={event => props.onChange({ templateId: event.currentTarget.value })}
					>
						<option value="">Choose template</option>
						{props.templates.map(template => (
							<option key={template.id} value={template.id}>
								{template.name}
							</option>
						))}
					</select>
				</FormField>

				<FormField label="Type" htmlFor={`${props.idPrefix}-type`}>
					<select
						id={`${props.idPrefix}-type`}
						className={selectClassName()}
						disabled={props.disabled}
						value={props.draft.type}
						onChange={event => props.onChange({ type: toQuestionType(event.currentTarget.value) })}
					>
						{questionTypes.map(questionType => (
							<option key={questionType} value={questionType}>
								{formatLabel(questionType)}
							</option>
						))}
					</select>
				</FormField>

				<FormField label="Position" htmlFor={`${props.idPrefix}-position`}>
					<Input
						id={`${props.idPrefix}-position`}
						disabled={props.disabled}
						min={0}
						type="number"
						value={String(props.draft.position)}
						onChange={event => props.onChange({ position: parseInteger(event.currentTarget.value) })}
					/>
				</FormField>
			</div>

			<div className="cf:grid cf:gap-4 cf:lg:grid-cols-[12rem_1fr]">
				<FormField label="Section" htmlFor={`${props.idPrefix}-section`}>
					<Input
						id={`${props.idPrefix}-section`}
						disabled={props.disabled}
						value={props.draft.section}
						onChange={event => props.onChange({ section: event.currentTarget.value })}
					/>
				</FormField>

				<FormField label="Label" htmlFor={`${props.idPrefix}-label`}>
					<Input
						id={`${props.idPrefix}-label`}
						disabled={props.disabled}
						value={props.draft.label}
						onChange={event => props.onChange({ label: event.currentTarget.value })}
					/>
				</FormField>
			</div>

			<div className="cf:grid cf:gap-4 cf:lg:grid-cols-2">
				<FormField label="Help text" htmlFor={`${props.idPrefix}-help`}>
					<Input
						id={`${props.idPrefix}-help`}
						disabled={props.disabled}
						value={props.draft.helpText}
						onChange={event => props.onChange({ helpText: event.currentTarget.value })}
					/>
				</FormField>

				<FormField label="Placeholder" htmlFor={`${props.idPrefix}-placeholder`}>
					<Input
						id={`${props.idPrefix}-placeholder`}
						disabled={props.disabled}
						value={props.draft.placeholder}
						onChange={event => props.onChange({ placeholder: event.currentTarget.value })}
					/>
				</FormField>
			</div>

			{needsOptions && (
				<FormField label="Options" htmlFor={`${props.idPrefix}-options`}>
					<Textarea
						id={`${props.idPrefix}-options`}
						className="cf:min-h-28"
						disabled={props.disabled}
						placeholder="One option per line"
						value={props.draft.optionsText}
						onChange={event => props.onChange({ optionsText: event.currentTarget.value })}
					/>
				</FormField>
			)}

			<div className="cf:grid cf:gap-3 cf:lg:grid-cols-3">
				<BooleanOption
					title="Required"
					description="User must answer before submitting."
					checked={props.draft.required}
					disabled={props.disabled}
					onChange={checked => props.onChange({ required: checked })}
				/>

				<BooleanOption
					title="Show in report"
					description="Include answer in generated Markdown reports."
					checked={props.draft.showInReport}
					disabled={props.disabled}
					onChange={checked => props.onChange({ showInReport: checked })}
				/>

				<BooleanOption
					title="Private"
					description="Hide from reports unless explicitly handled by backend rules."
					checked={props.draft.isPrivate}
					disabled={props.disabled}
					onChange={checked => props.onChange({ isPrivate: checked })}
				/>
			</div>
		</div>
	);
}

/**
 * BooleanOption renders one checkbox option.
 */
function BooleanOption(props: {
	readonly title: string;
	readonly description: string;
	readonly checked: boolean;
	readonly disabled: boolean;
	readonly onChange: (checked: boolean) => void;
}): ReactElement {
	return (
		<label className="cf:flex cf:cursor-pointer cf:items-start cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-4">
			<Checkbox
				className="cf:mt-0.5"
				checked={props.checked}
				disabled={props.disabled}
				onCheckedChange={checked => props.onChange(checked === true)}
			/>
			<span>
				<span className="cf:block cf:text-sm cf:font-black cf:text-white">{props.title}</span>
				<span className="cf:mt-1 cf:block cf:text-sm cf:font-medium cf:leading-6 cf:text-slate-400">
					{props.description}
				</span>
			</span>
		</label>
	);
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
 * MessageRow renders form-builder feedback.
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
 * emptyTemplateDraft returns a blank template draft.
 */
function emptyTemplateDraft(): TemplateDraft {
	return {
		name: '',
		description: '',
		kind: 'daily',
		isActive: true,
	};
}

/**
 * emptyQuestionDraft returns a blank question draft.
 */
function emptyQuestionDraft(): QuestionDraft {
	return {
		templateId: '',
		section: 'general',
		label: '',
		helpText: '',
		placeholder: '',
		type: 'text',
		required: true,
		showInReport: true,
		isPrivate: false,
		position: 0,
		optionsText: '',
	};
}

/**
 * templateToDraft maps a template to editable draft state.
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
 * questionToDraft maps a question to editable draft state.
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
		position: question.position,
		optionsText: question.options.join('\n'),
	};
}

/**
 * questionDraftToRequest maps a question draft to API request shape.
 */
function questionDraftToRequest(draft: QuestionDraft): CreateStandupQuestionRequest {
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
		position: draft.position,
		options: parseOptions(draft.optionsText),
	};
}

/**
 * validateQuestionDraft validates question fields before save.
 */
function validateQuestionDraft(draft: QuestionDraft): string | null {
	if (draft.templateId.trim() === '') {
		return 'Choose a template for the question.';
	}

	if (draft.section.trim() === '') {
		return 'Question section is required.';
	}

	if (draft.label.trim() === '') {
		return 'Question label is required.';
	}

	if ((draft.type === 'dropdown' || draft.type === 'multi_select') && parseOptions(draft.optionsText).length === 0) {
		return 'Dropdown and multi-select questions need at least one option.';
	}

	return null;
}

/**
 * buildTemplateDrafts maps templates into editable drafts.
 */
function buildTemplateDrafts(templates: readonly StandupTemplate[]): TemplateDraftsByID {
	const drafts: TemplateDraftsByID = {};

	for (const template of templates) {
		drafts[template.id] = templateToDraft(template);
	}

	return drafts;
}

/**
 * buildQuestionDrafts maps questions into editable drafts.
 */
function buildQuestionDrafts(questions: readonly StandupQuestion[]): QuestionDraftsByID {
	const drafts: QuestionDraftsByID = {};

	for (const question of questions) {
		drafts[question.id] = questionToDraft(question);
	}

	return drafts;
}

/**
 * replaceTemplate replaces one template in a list.
 */
function replaceTemplate(
	templates: readonly StandupTemplate[],
	updatedTemplate: StandupTemplate,
): readonly StandupTemplate[] {
	return templates.map(template => (template.id === updatedTemplate.id ? updatedTemplate : template));
}

/**
 * replaceQuestion replaces one question in a list.
 */
function replaceQuestion(
	questions: readonly StandupQuestion[],
	updatedQuestion: StandupQuestion,
): readonly StandupQuestion[] {
	return questions.map(question => (question.id === updatedQuestion.id ? updatedQuestion : question));
}

/**
 * sortTemplates returns templates in a stable display order.
 */
function sortTemplates(templates: readonly StandupTemplate[]): readonly StandupTemplate[] {
	return [...templates].sort((first, second) => {
		if (first.kind === second.kind) {
			return first.name.localeCompare(second.name);
		}

		return first.kind.localeCompare(second.kind);
	});
}

/**
 * sortQuestions returns questions in template/position order.
 */
function sortQuestions(questions: readonly StandupQuestion[]): readonly StandupQuestion[] {
	return [...questions].sort((first, second) => {
		if (first.templateId === second.templateId) {
			return first.position - second.position || first.label.localeCompare(second.label);
		}

		return first.templateId.localeCompare(second.templateId);
	});
}

/**
 * parseOptions converts textarea text into unique options.
 */
function parseOptions(optionsText: string): readonly string[] {
	const seen = new Set<string>();
	const options: string[] = [];

	for (const line of optionsText.split('\n')) {
		const option = line.trim();

		if (option === '' || seen.has(option)) {
			continue;
		}

		seen.add(option);
		options.push(option);
	}

	return options;
}

/**
 * parseInteger parses a positive integer field.
 */
function parseInteger(value: string): number {
	const parsed = Number.parseInt(value, 10);

	if (!Number.isFinite(parsed) || parsed < 0) {
		return 0;
	}

	return parsed;
}

/**
 * toStandupKind narrows select values to supported standup kinds.
 */
function toStandupKind(value: string): StandupKind {
	if (value === 'weekly' || value === 'custom') {
		return value;
	}

	return 'daily';
}

/**
 * toQuestionType narrows select values to supported question types.
 */
function toQuestionType(value: string): QuestionType {
	switch (value) {
		case 'long_text':
		case 'checkbox':
		case 'boolean':
		case 'dropdown':
		case 'multi_select':
		case 'number':
		case 'duration':
			return value;

		case 'text':
		default:
			return 'text';
	}
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
 * formatDateTime formats an API timestamp.
 */
function formatDateTime(value: string): string {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return date.toLocaleString();
}

/**
 * formatLabel converts enum-like strings to labels.
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

	return 'Could not update standup form configuration.';
}
