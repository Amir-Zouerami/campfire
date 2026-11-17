import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactElement } from 'react';

import { cn } from '@/shared/lib/cn';

import { Icon } from '../primitives/Icon';
import { CONTROL_CLASS } from './controlStyles';
import { useFieldControl } from './Field';

/**
 * SelectOption is one choice in a Select.
 */
export type SelectOption = {
	readonly value: string;
	readonly label: string;
	readonly disabled?: boolean;
};

type SelectProps = {
	readonly value: string;
	readonly options: readonly SelectOption[];
	readonly onChange: (value: string) => void;
	readonly onBlur?: () => void;
	/** Shown as the empty first option; omit for selects that always have a value. */
	readonly placeholder?: string;
	readonly disabled?: boolean;
	readonly label?: string;
	/** A leading icon that says what the select is for when it has no visible label. */
	readonly icon?: LucideIcon;
	/** `auto` fits the longest option (toolbars); `full` fills its container (forms). */
	readonly width?: 'full' | 'auto';
};

/**
 * Select is a native dropdown: accessible, keyboard- and touch-friendly, and RTL-safe.
 * Searchable or remote option lists use Combobox instead.
 */
export function Select(props: SelectProps): ReactElement {
	const control = useFieldControl();

	return (
		<div className={cn('cf:relative cf:min-w-0', props.width === 'auto' ? 'cf:w-auto cf:min-w-44' : 'cf:w-full')}>
			{props.icon !== undefined && (
				<span className="cf:pointer-events-none cf:absolute cf:inset-y-0 cf:start-3.5 cf:flex cf:items-center cf:text-muted">
					<Icon icon={props.icon} size="md" />
				</span>
			)}
			<select
				{...control}
				value={props.value}
				disabled={props.disabled}
				aria-label={props.label}
				className={cn(CONTROL_CLASS, 'cf:h-11 cf:cursor-pointer cf:appearance-none cf:pe-10', props.icon !== undefined && 'cf:ps-11')}
				onChange={event => props.onChange(event.target.value)}
				onBlur={props.onBlur}
			>
				{props.placeholder !== undefined && <option value="">{props.placeholder}</option>}
				{props.options.map(option => (
					<option key={option.value} value={option.value} disabled={option.disabled}>
						{option.label}
					</option>
				))}
			</select>
			<span className="cf:pointer-events-none cf:absolute cf:inset-y-0 cf:end-3.5 cf:flex cf:items-center cf:text-muted">
				<Icon icon={ChevronDown} size="sm" />
			</span>
		</div>
	);
}
