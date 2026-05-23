import type { FormEvent, ReactElement } from 'react';
import { PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import type { TaskDraft, TaskDraftPatch } from './my-time.types';

/**
 * MyTaskCreatePanelProps contains create-task form state and actions.
 */
type MyTaskCreatePanelProps = {
	readonly draft: TaskDraft;
	readonly disabled: boolean;
	readonly onChange: (patch: TaskDraftPatch) => void;
	readonly onSubmit: () => Promise<void>;
};

/**
 * MyTaskCreatePanel renders the focused create-task form.
 */
export function MyTaskCreatePanel(props: MyTaskCreatePanelProps): ReactElement {
	/**
	 * handleSubmit submits the create-task form.
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
				<p className="cf:text-sm cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
					Create task
				</p>
				<h3 className="cf:mt-1 cf:text-xl cf:font-black cf:tracking-[-0.03em] cf:text-foreground">
					Add work you can log time against
				</h3>
			</div>

			<div className="cf:grid cf:gap-4">
				<FormField label="Title" htmlFor="campfire-my-task-title">
					<Input
						id="campfire-my-task-title"
						disabled={props.disabled}
						placeholder="Write API contract audit"
						value={props.draft.title}
						onChange={event => props.onChange({ title: event.currentTarget.value })}
					/>
				</FormField>

				<FormField label="Description" htmlFor="campfire-my-task-description">
					<Textarea
						id="campfire-my-task-description"
						disabled={props.disabled}
						placeholder="Optional context, notes, or acceptance criteria."
						value={props.draft.description}
						onChange={event => props.onChange({ description: event.currentTarget.value })}
					/>
				</FormField>

				<div className="cf:grid cf:gap-4 cf:md:grid-cols-3">
					<FormField label="Project ID" htmlFor="campfire-my-task-project">
						<Input
							id="campfire-my-task-project"
							disabled={props.disabled}
							placeholder="Optional"
							value={props.draft.projectId}
							onChange={event => props.onChange({ projectId: event.currentTarget.value })}
						/>
					</FormField>

					<FormField label="Category ID" htmlFor="campfire-my-task-category">
						<Input
							id="campfire-my-task-category"
							disabled={props.disabled}
							placeholder="Optional"
							value={props.draft.categoryId}
							onChange={event => props.onChange({ categoryId: event.currentTarget.value })}
						/>
					</FormField>

					<FormField label="Board URL" htmlFor="campfire-my-task-board">
						<Input
							id="campfire-my-task-board"
							disabled={props.disabled}
							placeholder="https://..."
							value={props.draft.boardUrl}
							onChange={event => props.onChange({ boardUrl: event.currentTarget.value })}
						/>
					</FormField>
				</div>
			</div>

			<div className="cf:flex cf:justify-end">
				<Button type="submit" disabled={props.disabled}>
					<PlusCircle className="cf:size-4" />
					Create task
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
