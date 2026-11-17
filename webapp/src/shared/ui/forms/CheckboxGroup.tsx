import type { ReactElement } from 'react';

import { Checkbox } from './Checkbox';

type CheckboxGroupProps = {
	readonly options: readonly string[];
	readonly value: readonly string[];
	readonly onChange: (value: readonly string[]) => void;
	readonly disabled?: boolean;
};

/**
 * CheckboxGroup chooses any number of options from a short list.
 */
export function CheckboxGroup(props: CheckboxGroupProps): ReactElement {
	return (
		<div className="cf:flex cf:flex-col cf:gap-2.5">
			{props.options.map(option => (
				<Checkbox
					key={option}
					label={option}
					disabled={props.disabled}
					checked={props.value.includes(option)}
					onChange={checked => props.onChange(checked ? [...props.value, option] : props.value.filter(item => item !== option))}
				/>
			))}
		</div>
	);
}
