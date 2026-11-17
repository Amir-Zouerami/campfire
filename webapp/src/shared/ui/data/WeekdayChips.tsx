import type { ReactElement } from 'react';

import { cn } from '@/shared/lib/cn';

/**
 * WeekdayChip is one day of the week.
 */
export type WeekdayChip = {
	/** 0 (Sunday) to 6 (Saturday), the backend numbering. */
	readonly weekday: number;
	readonly label: string;
	/** `on` is selected, `inactive` is unselected, `off` is a non-working day that cannot be chosen. */
	readonly state: 'on' | 'inactive' | 'off';
};

type WeekdayChipsProps = {
	readonly days: readonly WeekdayChip[];
	/** Makes the chips toggleable; omit for a read-only display. */
	readonly onToggle?: (weekday: number) => void;
	readonly label: string;
};

const STATE_CLASS = {
	on: 'cf:border-area-soft cf:bg-area-soft cf:text-area-ink',
	inactive: 'cf:border-line-strong cf:bg-surface cf:text-muted',
	off: 'cf:border-dashed cf:border-line-strong cf:bg-[repeating-linear-gradient(135deg,#eceff6_0_5px,#f7f8fc_5px_10px)] cf:text-subtle',
} as const;

/**
 * WeekdayChips shows or edits a set of weekdays, such as the days a schedule runs.
 */
export function WeekdayChips(props: WeekdayChipsProps): ReactElement {
	return (
		<div role="group" aria-label={props.label} className="cf:flex cf:flex-wrap cf:gap-1.5">
			{props.days.map(day => {
				const className = cn(
					'cf:grid cf:h-8 cf:min-w-11 cf:place-items-center cf:rounded-lg cf:border cf:px-2 cf:text-[12.5px] cf:font-semibold',
					STATE_CLASS[day.state],
				);

				if (props.onToggle === undefined || day.state === 'off') {
					return (
						<span key={day.weekday} className={className} aria-disabled={day.state === 'off' ? true : undefined}>
							{day.label}
						</span>
					);
				}

				return (
					<button
						key={day.weekday}
						type="button"
						aria-pressed={day.state === 'on'}
						onClick={() => props.onToggle?.(day.weekday)}
						className={cn(
							className,
							'cf:cursor-pointer cf:focus-visible:outline-2 cf:focus-visible:outline-offset-1 cf:focus-visible:outline-area',
						)}
					>
						{day.label}
					</button>
				);
			})}
		</div>
	);
}
