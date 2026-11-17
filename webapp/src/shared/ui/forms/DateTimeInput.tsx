import type { ReactElement } from 'react';

import { DateField } from './DateField';
import { TimeField } from './TimeField';

type DateTimeInputProps = {
	/** A local `YYYY-MM-DDTHH:mm` value, or an empty string. */
	readonly value: string;
	readonly onChange: (value: string) => void;
	readonly disabled?: boolean;
};

/**
 * DateTimeInput edits one local date-time as a date control beside a time control. The value
 * is only emitted once both parts are present, so a half-filled pair never reaches the form.
 */
export function DateTimeInput(props: DateTimeInputProps): ReactElement {
	const [date = '', time = ''] = props.value.split('T');

	return (
		<div className="cf:grid cf:grid-cols-1 cf:gap-3 cf:md:grid-cols-2">
			<DateField
				value={date}
				disabled={props.disabled}
				onChange={next => props.onChange(next === '' || time === '' ? '' : `${next}T${time}`)}
			/>
			<TimeField
				value={time}
				disabled={props.disabled}
				onChange={next => props.onChange(date === '' || next === '' ? '' : `${date}T${next}`)}
			/>
		</div>
	);
}
