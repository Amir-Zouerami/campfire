import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { Check } from 'lucide-react';
import type { ReactElement } from 'react';

import { Icon } from '../primitives/Icon';
import { Text } from '../layout/Text';

type CheckboxProps = {
	readonly checked: boolean;
	readonly onChange: (checked: boolean) => void;
	readonly label: string;
	readonly description?: string;
	readonly disabled?: boolean;
};

/**
 * Checkbox is a labelled boolean control for inclusion choices.
 */
export function Checkbox(props: CheckboxProps): ReactElement {
	return (
		<label className="cf:flex cf:cursor-pointer cf:items-start cf:gap-3">
			<BaseCheckbox.Root
				checked={props.checked}
				disabled={props.disabled}
				onCheckedChange={props.onChange}
				className="cf:mt-0.5 cf:grid cf:size-5 cf:shrink-0 cf:place-items-center cf:rounded-md cf:border-[1.5px] cf:border-line-strong cf:bg-surface cf:text-on-brand cf:data-checked:border-brand cf:data-checked:bg-brand cf:focus-visible:outline-2 cf:focus-visible:outline-offset-2 cf:focus-visible:outline-area cf:data-disabled:opacity-50"
			>
				<BaseCheckbox.Indicator className="cf:grid cf:place-items-center cf:data-unchecked:hidden">
					<Icon icon={Check} size="xs" />
				</BaseCheckbox.Indicator>
			</BaseCheckbox.Root>
			<span className="cf:flex cf:flex-col">
				<Text weight="medium">{props.label}</Text>
				{props.description !== undefined && (
					<Text size="sm" tone="muted">
						{props.description}
					</Text>
				)}
			</span>
		</label>
	);
}
