import type { FormEvent, ReactElement } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import type { WorkspaceOffDayDraft, WorkspaceOffDayDraftPatch } from './working-calendar.types';

/**
 * WorkspaceOffDayCreatePanelProps contains create off-day form state.
 */
type WorkspaceOffDayCreatePanelProps = {
	readonly draft: WorkspaceOffDayDraft;
	readonly disabled: boolean;
	readonly canManageCalendar: boolean;
	readonly onChange: (patch: WorkspaceOffDayDraftPatch) => void;
	readonly onCreate: () => Promise<void>;
};

/**
 * WorkspaceOffDayCreatePanel renders the add workspace off-day form.
 */
export function WorkspaceOffDayCreatePanel(props: WorkspaceOffDayCreatePanelProps): ReactElement {
	/**
	 * handleSubmit creates the workspace off-day.
	 */
	function handleSubmit(event: FormEvent<HTMLFormElement>): void {
		event.preventDefault();
		void props.onCreate();
	}

	return (
		<form
			className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5"
			onSubmit={handleSubmit}
		>
			<div>
				<p className="cf:text-sm cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
					Add off-day
				</p>
				<h3 className="cf:mt-1 cf:text-xl cf:font-black cf:tracking-[-0.03em] cf:text-foreground">
					Skip a workspace date
				</h3>
			</div>

			<div className="cf:grid cf:gap-4 cf:md:grid-cols-[14rem_1fr]">
				<div className="cf:grid cf:gap-2">
					<Label htmlFor="campfire-workspace-off-day-date">Date</Label>
					<Input
						id="campfire-workspace-off-day-date"
						type="date"
						disabled={props.disabled || !props.canManageCalendar}
						value={props.draft.date}
						onChange={event => props.onChange({ date: event.currentTarget.value })}
					/>
				</div>

				<div className="cf:grid cf:gap-2">
					<Label htmlFor="campfire-workspace-off-day-label">Label</Label>
					<Input
						id="campfire-workspace-off-day-label"
						disabled={props.disabled || !props.canManageCalendar}
						placeholder="Company holiday"
						value={props.draft.label}
						onChange={event => props.onChange({ label: event.currentTarget.value })}
					/>
				</div>
			</div>

			<div className="cf:flex cf:justify-end">
				<Button type="submit" disabled={props.disabled || !props.canManageCalendar}>
					<Plus className="cf:size-4" />
					Add off-day
				</Button>
			</div>
		</form>
	);
}
