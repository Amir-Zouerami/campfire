import type { ReactElement } from 'react';

import { Checkbox } from '@/components/ui/checkbox';

/**
 * StandupBooleanFieldProps contains one checkbox setting.
 */
type StandupBooleanFieldProps = {
	readonly checked: boolean;
	readonly label: string;
	readonly description: string;
	readonly disabled: boolean;
	readonly onChange: (checked: boolean) => void;
};

/**
 * StandupBooleanField renders a consistently aligned standup checkbox row.
 */
export function StandupBooleanField(props: StandupBooleanFieldProps): ReactElement {
	return (
		<label className="cf:flex cf:cursor-pointer cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4 cf:transition hover:cf:border-amber-300/25">
			<Checkbox
				checked={props.checked}
				disabled={props.disabled}
				onCheckedChange={checked => props.onChange(checked === true)}
			/>
			<span className="cf:grid cf:gap-1">
				<span className="cf:text-sm cf:font-black cf:text-foreground">{props.label}</span>
				<span className="cf:text-xs cf:font-semibold cf:leading-5 cf:text-muted-foreground">
					{props.description}
				</span>
			</span>
		</label>
	);
}
