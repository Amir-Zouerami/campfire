import type { KeyboardEvent, ReactElement, Ref } from 'react';

import { cn } from '@/shared/lib/cn';

import { CONTROL_CLASS } from './controlStyles';
import { useFieldControl } from './Field';

export type TextInputProps = {
	readonly value: string;
	readonly onChange: (value: string) => void;
	readonly onBlur?: () => void;
	readonly onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
	readonly placeholder?: string;
	readonly type?: 'text' | 'search' | 'email' | 'url' | 'password';
	readonly inputMode?: 'text' | 'numeric' | 'decimal' | 'search';
	readonly disabled?: boolean;
	readonly readOnly?: boolean;
	readonly autoFocus?: boolean;
	readonly maxLength?: number;
	readonly name?: string;
	/** Accessible name when there is no surrounding Field label. */
	readonly label?: string;
	/** Marks user-authored text so mixed Persian/English content picks its own direction. */
	readonly userContent?: boolean;
	/** Left-to-right content (times, ids) stays LTR even inside RTL layouts. */
	readonly ltr?: boolean;
	readonly ref?: Ref<HTMLInputElement>;
};

/**
 * TextInput is a single-line text control.
 */
export function TextInput({ ref, ...props }: TextInputProps): ReactElement {
	const control = useFieldControl();

	return (
		<input
			{...control}
			ref={ref}
			type={props.type ?? 'text'}
			inputMode={props.inputMode}
			name={props.name}
			value={props.value}
			placeholder={props.placeholder}
			disabled={props.disabled}
			readOnly={props.readOnly}
			autoFocus={props.autoFocus}
			maxLength={props.maxLength}
			aria-label={props.label}
			dir={props.ltr === true ? 'ltr' : props.userContent === true ? 'auto' : undefined}
			autoComplete="off"
			className={cn(CONTROL_CLASS, 'cf:h-11', props.ltr === true && 'cf:text-start')}
			onChange={event => props.onChange(event.target.value)}
			onBlur={props.onBlur}
			onKeyDown={props.onKeyDown}
		/>
	);
}
