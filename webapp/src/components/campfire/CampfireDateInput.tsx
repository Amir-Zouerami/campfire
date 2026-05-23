import type { ChangeEvent, ReactElement } from 'react';

import { Input } from '@/components/ui/input';

/**
 * CampfireDateInputProps contains a native date input with Campfire styling.
 */
type CampfireDateInputProps = {
	readonly id: string;
	readonly value: string;
	readonly disabled?: boolean;
	readonly onValueChange: (value: string) => void;
};

/**
 * CampfireDateInput renders a consistently styled native date input.
 */
export function CampfireDateInput(props: CampfireDateInputProps): ReactElement {
	/**
	 * handleChange forwards only the selected date value.
	 */
	function handleChange(event: ChangeEvent<HTMLInputElement>): void {
		props.onValueChange(event.currentTarget.value);
	}

	return <Input id={props.id} type="date" disabled={props.disabled} value={props.value} onChange={handleChange} />;
}
