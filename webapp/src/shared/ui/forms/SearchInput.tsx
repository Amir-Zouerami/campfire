import { Search } from 'lucide-react';
import type { ReactElement } from 'react';

import { cn } from '@/shared/lib/cn';

import { Icon } from '../primitives/Icon';
import { CONTROL_CLASS } from './controlStyles';

type SearchInputProps = {
	readonly value: string;
	readonly onChange: (value: string) => void;
	readonly placeholder: string;
	/** Accessible name; defaults to the placeholder. */
	readonly label?: string;
};

/**
 * SearchInput is a text control with a leading search glyph.
 */
export function SearchInput(props: SearchInputProps): ReactElement {
	return (
		<div className="cf:relative cf:w-full">
			<span className="cf:pointer-events-none cf:absolute cf:inset-y-0 cf:start-3.5 cf:flex cf:items-center cf:text-subtle">
				<Icon icon={Search} size="sm" />
			</span>
			<input
				type="search"
				value={props.value}
				placeholder={props.placeholder}
				aria-label={props.label ?? props.placeholder}
				autoComplete="off"
				className={cn(CONTROL_CLASS, 'cf:h-11 cf:ps-10')}
				onChange={event => props.onChange(event.target.value)}
			/>
		</div>
	);
}
