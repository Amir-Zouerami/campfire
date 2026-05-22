import type { ReactElement } from 'react';
import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * TeamRuntimeControlsProps contains runtime date controls.
 */
type TeamRuntimeControlsProps = {
	readonly date: string;
	readonly disabled: boolean;
	readonly onDateChange: (date: string) => void;
	readonly onTodayClick: () => void;
};

/**
 * TeamRuntimeControls renders the runtime date picker.
 */
export function TeamRuntimeControls(props: TeamRuntimeControlsProps): ReactElement {
	return (
		<div className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5 cf:lg:grid-cols-[1fr_auto] cf:lg:items-end">
			<div className="cf:grid cf:gap-2">
				<Label htmlFor="campfire-team-runtime-date">Runtime date</Label>
				<Input
					id="campfire-team-runtime-date"
					type="date"
					disabled={props.disabled}
					value={props.date}
					onChange={event => props.onDateChange(event.currentTarget.value)}
				/>
			</div>

			<Button type="button" variant="secondary" disabled={props.disabled} onClick={props.onTodayClick}>
				<Search className="cf:size-4" />
				Today
			</Button>
		</div>
	);
}
