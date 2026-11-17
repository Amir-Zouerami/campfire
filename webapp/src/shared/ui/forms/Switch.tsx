import { Switch as BaseSwitch } from '@base-ui/react/switch';
import type { ReactElement } from 'react';

import { Text } from '../layout/Text';

type SwitchProps = {
	readonly checked: boolean;
	readonly onChange: (checked: boolean) => void;
	readonly label: string;
	readonly description?: string;
	readonly disabled?: boolean;
};

/**
 * Switch is a labelled on/off setting, rendered as a row with the toggle at the end.
 */
export function Switch(props: SwitchProps): ReactElement {
	return (
		<label className="cf:flex cf:cursor-pointer cf:items-center cf:justify-between cf:gap-6 cf:border-b cf:border-line cf:py-3.5 cf:first:border-t">
			<span className="cf:flex cf:flex-col">
				<Text weight="bold">{props.label}</Text>
				{props.description !== undefined && (
					<Text size="sm" tone="muted">
						{props.description}
					</Text>
				)}
			</span>
			<BaseSwitch.Root
				checked={props.checked}
				disabled={props.disabled}
				onCheckedChange={props.onChange}
				className="cf:m-0 cf:flex cf:h-[26px] cf:w-[46px] cf:shrink-0 cf:cursor-pointer cf:appearance-none cf:items-center cf:rounded-full cf:border-0 cf:bg-line-strong cf:p-[3px] cf:transition-colors cf:data-checked:bg-brand cf:focus-visible:outline-2 cf:focus-visible:outline-offset-2 cf:focus-visible:outline-area cf:data-disabled:opacity-50"
			>
				<BaseSwitch.Thumb className="cf:size-5 cf:rounded-full cf:bg-surface cf:shadow-sm cf:transition-transform cf:data-checked:translate-x-5 cf:rtl:data-checked:-translate-x-5" />
			</BaseSwitch.Root>
		</label>
	);
}
