import type { ReactElement } from 'react';

import { TextInput } from './TextInput';

type NumberInputProps = {
	readonly value: string;
	readonly onChange: (value: string) => void;
	readonly onBlur?: () => void;
	readonly placeholder?: string;
	readonly disabled?: boolean;
	readonly label?: string;
	/** Allows a decimal part. */
	readonly decimal?: boolean;
};

/**
 * NumberInput accepts digits only. It is a text control with a numeric keypad on touch
 * devices, which avoids the browser's locale-dependent <input type="number"> quirks.
 */
export function NumberInput(props: NumberInputProps): ReactElement {
	const pattern = props.decimal === true ? /[^0-9.]/g : /[^0-9]/g;

	return (
		<TextInput
			ltr
			value={props.value}
			inputMode={props.decimal === true ? 'decimal' : 'numeric'}
			placeholder={props.placeholder}
			disabled={props.disabled}
			label={props.label}
			onBlur={props.onBlur}
			onChange={value => props.onChange(value.replace(pattern, ''))}
		/>
	);
}
