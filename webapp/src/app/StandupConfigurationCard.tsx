import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { ClipboardList, Clock3, FileQuestion, Loader2 } from 'lucide-react';

import { ApiClientError, listStandupConfiguration } from '@/api';
import { Separator } from '@/components/ui/separator';
import type { StandupQuestion, StandupSchedule, StandupTemplate, Workspace } from '@/types/domain';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireEmpty,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from './campfire-ui';

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
 * StandupConfigurationCard shows the current standup templates, questions, and schedules.
 */
export function StandupConfigurationCard(props: StandupConfigurationCardProps): ReactElement {
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [templates, setTemplates] = useState<readonly StandupTemplate[]>([]);
	const [questions, setQuestions] = useState<readonly StandupQuestion[]>([]);
	const [schedules, setSchedules] = useState<readonly StandupSchedule[]>([]);
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * Loads current standup configuration.
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
	const activeTemplateCount = useMemo(() => templates.filter(template => template.isActive).length, [templates]);
	const enabledScheduleCount = useMemo(() => schedules.filter(schedule => schedule.enabled).length, [schedules]);

	return (
		<CampfirePanel className="cf:overflow-hidden">
			<CampfireCardHeader
				eyebrow="Configuration"
				title="Standup configuration"
				description="A read-only overview of templates, questions, and schedules currently attached to this workspace."
				icon={ClipboardList}
				action={<CampfireStatusPill tone="ember">{activeTemplateCount} active templates</CampfireStatusPill>}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
				<div className="cf:grid cf:gap-3 cf:md:grid-cols-4">
					<CampfireMetric
						label="Templates"
						value={String(templates.length)}
						helper={`${activeTemplateCount} active`}
					/>
					<CampfireMetric
						label="Questions"
						value={String(questions.length)}
						helper="Across templates"
						icon={FileQuestion}
					/>
					<CampfireMetric
						label="Schedules"
						value={String(schedules.length)}
						helper={`${enabledScheduleCount} enabled`}
						icon={Clock3}
					/>
					<CampfireMetric label="Workspace" value={props.workspace.name} helper={props.workspace.timezone} />
				</div>

				{message !== '' && <MessageRow state={loadState} message={message} />}
				{loadState === 'loading' && <LoadingRow label="Loading standup configuration…" />}

				{loadState !== 'loading' && templates.length === 0 && (
					<CampfireEmpty
						icon={ClipboardList}
						title="No standup templates"
						description="Create daily or weekly templates in the form builder to start collecting standups."
					/>
				)}

				<div className="cf:grid cf:gap-4">
					{templates.map(template => (
						<TemplateOverviewCard
							key={template.id}
							template={template}
							questions={questionsByTemplateID[template.id] ?? []}
							schedules={schedulesByTemplateID[template.id] ?? []}
						/>
					))}
				</div>
			</CampfireCardBody>
		</CampfirePanel>
	);
}

/**
 * TemplateOverviewCard renders one template overview.
 */
function TemplateOverviewCard(props: {
	readonly template: StandupTemplate;
	readonly questions: readonly StandupQuestion[];
	readonly schedules: readonly StandupSchedule[];
}): ReactElement {
	const sortedQuestions = [...props.questions].sort((first, second) => first.position - second.position);

	return (
		<article className="cf:rounded-3xl cf:border cf:border-white/10 cf:bg-slate-950/40 cf:p-4">
			<div className="cf:flex cf:flex-col cf:gap-4 cf:lg:flex-row cf:lg:items-start cf:lg:justify-between">
				<div>
					<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
						<strong className="cf:text-xl cf:font-black cf:tracking-tight cf:text-white">
							{props.template.name}
						</strong>
						<CampfireStatusPill tone={props.template.isActive ? 'green' : 'slate'}>
							{props.template.isActive ? 'Active' : 'Inactive'}
						</CampfireStatusPill>
						<CampfireStatusPill tone="ember">{formatLabel(props.template.kind)}</CampfireStatusPill>
					</div>

					{props.template.description !== '' && (
						<p className="cf:mt-3 cf:max-w-3xl cf:text-sm cf:font-medium cf:leading-7 cf:text-slate-300">
							{props.template.description}
						</p>
					)}
				</div>

				<div className="cf:grid cf:grid-cols-2 cf:gap-2 cf:sm:min-w-64">
					<SmallMetric label="Questions" value={String(props.questions.length)} />
					<SmallMetric label="Schedules" value={String(props.schedules.length)} />
				</div>
			</div>

			<Separator className="cf:my-4 cf:bg-white/10" />

			<div className="cf:grid cf:gap-4 cf:xl:grid-cols-2">
				<section>
					<h4 className="cf:text-sm cf:font-black cf:uppercase cf:tracking-widest cf:text-amber-200">
						Questions
					</h4>

					<div className="cf:mt-3 cf:grid cf:gap-2">
						{sortedQuestions.length === 0 && (
							<p className="cf:text-sm cf:font-medium cf:text-slate-400">No questions attached.</p>
						)}

						{sortedQuestions.map(question => (
							<QuestionRow question={question} key={question.id} />
						))}
					</div>
				</section>

				<section>
					<h4 className="cf:text-sm cf:font-black cf:uppercase cf:tracking-widest cf:text-amber-200">
						Schedules
					</h4>

					<div className="cf:mt-3 cf:grid cf:gap-2">
						{props.schedules.length === 0 && (
							<p className="cf:text-sm cf:font-medium cf:text-slate-400">No schedules attached.</p>
						)}

						{props.schedules.map(schedule => (
							<ScheduleRow schedule={schedule} key={schedule.id} />
						))}
					</div>
				</section>
			</div>
		</article>
	);
}

/**
 * QuestionRow renders one question in the configuration overview.
 */
function QuestionRow(props: { readonly question: StandupQuestion }): ReactElement {
	return (
		<div className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-3">
			<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
				<strong className="cf:text-sm cf:font-black cf:text-white">{props.question.label}</strong>
				<StatusChip label={formatLabel(props.question.type)} />
				{props.question.required && <StatusChip label="Required" />}
				{props.question.showInReport && <StatusChip label="Report" />}
				{props.question.isPrivate && <StatusChip label="Private" />}
			</div>

			{props.question.helpText !== '' && (
				<p className="cf:mt-2 cf:text-sm cf:font-medium cf:leading-6 cf:text-slate-400">
					{props.question.helpText}
				</p>
			)}
		</div>
	);
}

/**
 * ScheduleRow renders one schedule in the configuration overview.
 */
function ScheduleRow(props: { readonly schedule: StandupSchedule }): ReactElement {
	return (
		<div className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-3">
			<div className="cf:flex cf:flex-wrap cf:gap-2">
				<StatusChip label={props.schedule.enabled ? 'Enabled' : 'Disabled'} />
				<StatusChip label={formatLabel(props.schedule.kind)} />
				{props.schedule.weeklyMode !== '' && <StatusChip label={formatLabel(props.schedule.weeklyMode)} />}
			</div>

			<p className="cf:mt-2 cf:text-sm cf:font-bold cf:text-slate-200">Runs at {props.schedule.timeOfDay}</p>

			<ul className="cf:mt-2 cf:grid cf:list-none cf:gap-1 cf:p-0 cf:text-xs cf:font-medium cf:text-slate-400">
				<li>Skip non-working days: {props.schedule.skipNonWorkingDays ? 'yes' : 'no'}</li>
				<li>Skip daily when weekly runs: {props.schedule.skipDailyWhenWeeklyRuns ? 'yes' : 'no'}</li>
			</ul>
		</div>
	);
}

/**
 * SmallMetric renders a compact template metric.
 */
function SmallMetric(props: { readonly label: string; readonly value: string }): ReactElement {
	return (
		<div className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-3">
			<span className="cf:block cf:text-xs cf:font-black cf:uppercase cf:tracking-widest cf:text-amber-200">
				{props.label}
			</span>
			<strong className="cf:mt-1 cf:block cf:text-lg cf:font-black cf:text-white">{props.value}</strong>
		</div>
	);
}

/**
 * StatusChip renders a compact metadata chip.
 */
function StatusChip(props: { readonly label: string }): ReactElement {
	return (
		<span className="cf:rounded-full cf:border cf:border-amber-300/20 cf:bg-amber-300/10 cf:px-2.5 cf:py-1 cf:text-xs cf:font-black cf:uppercase cf:tracking-widest cf:text-amber-100">
			{props.label}
		</span>
	);
}

/**
 * MessageRow renders a status or error row.
 */
function MessageRow(props: { readonly state: LoadState; readonly message: string }): ReactElement {
	const isError = props.state === 'error';

	return (
		<div
			className={
				isError
					? 'cf:rounded-2xl cf:border cf:border-red-300/25 cf:bg-red-950/30 cf:px-4 cf:py-3 cf:text-sm cf:font-black cf:text-red-100'
					: 'cf:rounded-2xl cf:border cf:border-amber-300/25 cf:bg-amber-950/30 cf:px-4 cf:py-3 cf:text-sm cf:font-black cf:text-amber-100'
			}
		>
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
 * formatLabel converts enum-like values to labels.
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

	return 'Could not load standup configuration.';
}
