import type { ReactElement } from 'react';
import { Search } from 'lucide-react';

import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { Button } from '@/components/ui/button';
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
		<div className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5 cf:lg:grid-cols-[1fr_auto] cf:lg:items-end">
			<div className="cf:grid cf:gap-2">
				<Label htmlFor="campfire-team-runtime-date">Runtime date</Label>
				<CampfireDateInput
					id="campfire-team-runtime-date"
					disabled={props.disabled}
					value={props.date}
					onValueChange={props.onDateChange}
				/>
			</div>

			<Button type="button" variant="secondary" disabled={props.disabled} onClick={props.onTodayClick}>
				<Search className="cf:size-4" />
				Today
			</Button>
		</div>
	);
}
