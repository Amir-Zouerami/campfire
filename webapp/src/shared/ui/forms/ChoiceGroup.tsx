import { Radio } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';
import type { ReactElement } from 'react';

import { cn } from '@/shared/lib/cn';

import { useFieldControl } from './Field';

/**
 * ChoiceOption is one selectable choice.
 */
export type ChoiceOption = {
	readonly value: string;
	readonly label: string;
	readonly disabled?: boolean;
};

type ChoiceGroupProps = {
	readonly value: string;
	readonly options: readonly ChoiceOption[];
	readonly onChange: (value: string) => void;
	/** `buttons` are separate choices (Yes / No); `segmented` is one joined control (Full day / Half day / Hourly). */
	readonly variant?: 'buttons' | 'segmented';
	readonly label?: string;
	readonly disabled?: boolean;
};

/**
 * ChoiceGroup is a single-choice radio group with a button-like appearance.
 */
export function ChoiceGroup(props: ChoiceGroupProps): ReactElement {
	const control = useFieldControl();
	const segmented = props.variant === 'segmented';

	return (
		<RadioGroup
			value={props.value}
			disabled={props.disabled}
			aria-label={props.label}
			aria-describedby={control['aria-describedby']}
			onValueChange={value => props.onChange(String(value))}
			className={cn(
				'cf:flex cf:w-max cf:max-w-full cf:flex-wrap',
				segmented ? 'cf:overflow-hidden cf:rounded-control cf:border cf:border-line-strong cf:bg-surface' : 'cf:gap-2.5',
			)}
		>
			{props.options.map(option => (
				<Radio.Root
					key={option.value}
					value={option.value}
					disabled={option.disabled}
					className={cn(
						'cf:inline-flex cf:h-[42px] cf:cursor-pointer cf:items-center cf:px-5 cf:text-sm cf:font-semibold cf:transition-colors',
						'cf:focus-visible:outline-2 cf:focus-visible:outline-offset-2 cf:focus-visible:outline-area cf:data-disabled:cursor-not-allowed cf:data-disabled:opacity-50',
						segmented
							? 'cf:border-s cf:border-line-strong cf:text-ink cf:first:border-s-0 cf:data-checked:bg-brand cf:data-checked:text-on-brand'
							: 'cf:rounded-control cf:border cf:border-line-strong cf:bg-surface cf:text-ink cf:hover:bg-sunken cf:data-checked:border-brand cf:data-checked:bg-sunken cf:data-checked:shadow-[inset_0_0_0_1px_var(--cf-color-brand)]',
					)}
				>
					{option.label}
				</Radio.Root>
			))}
		</RadioGroup>
	);
}
