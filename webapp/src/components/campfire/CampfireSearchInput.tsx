import type { ReactElement } from 'react';
import { Search } from 'lucide-react';

import { cn } from '@/lib/utils';
import { CampfireResponsiveInput } from './CampfireResponsiveInput';

/**
 * CampfireSearchInputProps contains one toolbar-safe search field.
 */
export type CampfireSearchInputProps = {
	readonly value: string;
	readonly placeholder: string;
	readonly disabled?: boolean;
	readonly className?: string;
	readonly inputClassName?: string;
	readonly ariaLabel?: string;
	readonly onValueChange: (value: string) => void;
};

/**
 * CampfireSearchInput renders a centered search input with the shared control height.
 */
export function CampfireSearchInput(props: CampfireSearchInputProps): ReactElement {
	return (
		<label className={cn('campfire-search-input', props.className)}>
			<Search className="campfire-search-input-icon" aria-hidden="true" />
			<CampfireResponsiveInput
				type="search"
				value={props.value}
				disabled={props.disabled}
				placeholder={props.placeholder}
				aria-label={props.ariaLabel ?? props.placeholder}
				className={cn('campfire-search-input-control', props.inputClassName)}
				onValueChange={props.onValueChange}
			/>
		</label>
	);
}
