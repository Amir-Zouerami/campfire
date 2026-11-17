import type { ReactElement } from 'react';

import { cn } from '@/shared/lib/cn';

import { CONTROL_CLASS } from './controlStyles';
import { useFieldControl } from './Field';

type TextAreaProps = {
	readonly value: string;
	readonly onChange: (value: string) => void;
	readonly onBlur?: () => void;
	readonly placeholder?: string;
	readonly rows?: number;
	readonly disabled?: boolean;
	readonly maxLength?: number;
	readonly label?: string;
	readonly userContent?: boolean;
	/** Forces left-to-right text, for code such as JSON. */
	readonly ltr?: boolean;
};

/**
 * TextArea is a multi-line text control that grows with its content where the browser supports it.
 */
export function TextArea(props: TextAreaProps): ReactElement {
	const control = useFieldControl();

	return (
		<textarea
			{...control}
			value={props.value}
			rows={props.rows ?? 3}
			placeholder={props.placeholder}
			disabled={props.disabled}
			maxLength={props.maxLength}
			aria-label={props.label}
			dir={props.ltr === true ? 'ltr' : props.userContent === true ? 'auto' : undefined}
			className={cn(CONTROL_CLASS, 'cf:resize-none cf:py-2.5 cf:leading-relaxed cf:[field-sizing:content] cf:max-h-72')}
			onChange={event => props.onChange(event.target.value)}
			onBlur={props.onBlur}
		/>
	);
}
