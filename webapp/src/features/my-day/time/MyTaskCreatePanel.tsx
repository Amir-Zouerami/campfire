import type { FormEvent, ReactElement, ReactNode } from 'react';
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
	const submitDisabled = props.disabled || props.draft.title.trim() === '';

	function handleSubmit(event: FormEvent<HTMLFormElement>): void {
		event.preventDefault();

		if (submitDisabled) {
			return;
		}

		void props.onSubmit();
	}

	return (
		<form
			className="cf:grid cf:self-start cf:content-start cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-4"
			onSubmit={handleSubmit}
		>
			<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-3">
				<div className="cf:min-w-0">
					<p className="cf:m-0 cf:text-xs cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
						New task
					</p>
					<h3 className="cf:m-0 cf:mt-1 cf:text-lg cf:font-black cf:tracking-[-0.03em] cf:text-foreground">
						Create trackable work
					</h3>
				</div>

				<Button type="submit" disabled={submitDisabled}>
					<PlusCircle className="cf:size-4" />
					Create task
				</Button>
			</div>

			<div className="cf:grid cf:gap-3">
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
						className="cf:min-h-24"
						disabled={props.disabled}
						placeholder="Optional context, notes, or acceptance criteria."
						value={props.draft.description}
						onChange={event => props.onChange({ description: event.currentTarget.value })}
					/>
				</FormField>

				<div className="cf:grid cf:gap-3 cf:md:grid-cols-3">
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
							placeholder="https://…"
							value={props.draft.boardUrl}
							onChange={event => props.onChange({ boardUrl: event.currentTarget.value })}
						/>
					</FormField>
				</div>
			</div>
		</form>
	);
}

/**
 * FormField renders a compact label/control pair.
 */
function FormField(props: {
	readonly label: string;
	readonly htmlFor: string;
	readonly children: ReactNode;
}): ReactElement {
	return (
		<div className="cf:grid cf:gap-2">
			<Label
				htmlFor={props.htmlFor}
				className="cf:text-xs cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100"
			>
				{props.label}
			</Label>
			{props.children}
		</div>
	);
}
