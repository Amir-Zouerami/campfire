import type { FormEvent, ReactElement } from 'react';
import { Clock3 } from 'lucide-react';

import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Task } from '@/types/domain';

import type { TimeEntryDraft, TimeEntryDraftPatch } from './my-time.types';

/**
 * MyTimeEntryPanelProps contains log-time form state and actions.
 */
type MyTimeEntryPanelProps = {
	readonly draft: TimeEntryDraft;
	readonly tasks: readonly Task[];
	readonly disabled: boolean;
	readonly onTaskChange: (taskId: string) => void;
	readonly onChange: (patch: TimeEntryDraftPatch) => void;
	readonly onSubmit: () => Promise<void>;
};

/**
 * MyTimeEntryPanel renders the focused log-time form.
 */
export function MyTimeEntryPanel(props: MyTimeEntryPanelProps): ReactElement {
	/**
	 * handleSubmit submits the log-time form.
	 */
	function handleSubmit(event: FormEvent<HTMLFormElement>): void {
		event.preventDefault();
		void props.onSubmit();
	}

	return (
		<form
			className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5"
			onSubmit={handleSubmit}
		>
			<div>
				<p className="cf:text-sm cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">Log time</p>
				<h3 className="cf:mt-1 cf:text-xl cf:font-black cf:tracking-[-0.03em] cf:text-foreground">
					Add time to a task
				</h3>
			</div>

			<div className="cf:grid cf:gap-4">
				<FormField label="Task" htmlFor="campfire-time-entry-task">
					<CampfireSelect
						id="campfire-time-entry-task"
						disabled={props.disabled}
						value={props.draft.taskId}
						onValueChange={props.onTaskChange}
					>
						<option value="">Choose task</option>
						{props.tasks.map(task => (
							<option key={task.id} value={task.id}>
								{task.title}
							</option>
						))}
					</CampfireSelect>
				</FormField>

				<div className="cf:grid cf:gap-4 cf:md:grid-cols-2">
					<FormField label="Date" htmlFor="campfire-my-time-date">
						<CampfireDateInput
							id="campfire-my-time-date"
							disabled={props.disabled}
							value={props.draft.entryDate}
							onValueChange={value => props.onChange({ entryDate: value })}
						/>
					</FormField>

					<FormField label="Minutes" htmlFor="campfire-my-time-minutes">
						<Input
							id="campfire-my-time-minutes"
							type="number"
							min="1"
							step="5"
							disabled={props.disabled}
							value={props.draft.minutes}
							onChange={event => props.onChange({ minutes: event.currentTarget.value })}
						/>
					</FormField>
				</div>

				<FormField label="Note" htmlFor="campfire-my-time-note">
					<Textarea
						id="campfire-my-time-note"
						disabled={props.disabled}
						placeholder="What did this time cover?"
						value={props.draft.note}
						onChange={event => props.onChange({ note: event.currentTarget.value })}
					/>
				</FormField>

				<div className="cf:grid cf:gap-4 cf:md:grid-cols-2">
					<FormField label="Project ID" htmlFor="campfire-my-time-project">
						<Input
							id="campfire-my-time-project"
							disabled={props.disabled}
							placeholder="Optional"
							value={props.draft.projectId}
							onChange={event => props.onChange({ projectId: event.currentTarget.value })}
						/>
					</FormField>

					<FormField label="Category ID" htmlFor="campfire-my-time-category">
						<Input
							id="campfire-my-time-category"
							disabled={props.disabled}
							placeholder="Optional"
							value={props.draft.categoryId}
							onChange={event => props.onChange({ categoryId: event.currentTarget.value })}
						/>
					</FormField>
				</div>
			</div>

			<div className="cf:flex cf:justify-end">
				<Button type="submit" disabled={props.disabled || props.tasks.length === 0}>
					<Clock3 className="cf:size-4" />
					Log time
				</Button>
			</div>
		</form>
	);
}

/**
 * FormField renders a consistent labeled form field.
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
