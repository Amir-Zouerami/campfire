import type { FormEvent, ReactElement } from 'react';
import { Plus } from 'lucide-react';

import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireResponsiveInput } from '@/components/campfire/CampfireResponsiveInput';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

import type { GlobalOffDayDraft, GlobalOffDayDraftPatch } from './global-off-days.types';

/**
 * GlobalOffDayCreatePanelProps contains create global off-day form state.
 */
type GlobalOffDayCreatePanelProps = {
	readonly draft: GlobalOffDayDraft;
	readonly disabled: boolean;
	readonly isSystemAdmin: boolean;
	readonly onChange: (patch: GlobalOffDayDraftPatch) => void;
	readonly onCreate: () => Promise<void>;
};

/**
 * GlobalOffDayCreatePanel renders the create global off-day form.
 */
export function GlobalOffDayCreatePanel(props: GlobalOffDayCreatePanelProps): ReactElement {
	/**
	 * handleSubmit creates the global off-day.
	 */
	function handleSubmit(event: FormEvent<HTMLFormElement>): void {
		event.preventDefault();
		void props.onCreate();
	}

	return (
		<form
			className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5"
			onSubmit={handleSubmit}
		>
			<div>
				<p className="cf:text-sm cf:font-semibold cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
					Add global off-day
				</p>
				<h3 className="cf:mt-1 cf:text-xl cf:font-semibold cf:tracking-[-0.03em] cf:text-foreground">
					Skip all workspaces
				</h3>
			</div>

			<div className="cf:grid cf:gap-4 cf:md:grid-cols-[14rem_1fr]">
				<div className="cf:grid cf:gap-2">
					<Label htmlFor="campfire-global-off-day-date">Date</Label>
					<CampfireDateInput
						id="campfire-global-off-day-date"
						disabled={props.disabled || !props.isSystemAdmin}
						value={props.draft.date}
						onValueChange={value => props.onChange({ date: value })}
					/>
				</div>

				<div className="cf:grid cf:gap-2">
					<Label htmlFor="campfire-global-off-day-label">Label</Label>
					<CampfireResponsiveInput
						id="campfire-global-off-day-label"
						disabled={props.disabled || !props.isSystemAdmin}
						placeholder="Company-wide holiday"
						value={props.draft.label}
						onValueChange={value => props.onChange({ label: value })}
					/>
				</div>
			</div>

			<div className="cf:flex cf:justify-end">
				<Button type="submit" disabled={props.disabled || !props.isSystemAdmin}>
					<Plus className="cf:size-4" />
					Add global off-day
				</Button>
			</div>
		</form>
	);
}