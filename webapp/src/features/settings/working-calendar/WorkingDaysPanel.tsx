import type { ReactElement } from 'react';
import { Save } from 'lucide-react';

import { CampfireStatusPill } from '@/app/campfire-ui';
import { Button } from '@/components/ui/button';

import { toggleWeekday, weekdayButtonClassName, weekdayOptions } from './working-calendar.helpers';

/**
 * WorkingDaysPanelProps contains working-day selection state.
 */
type WorkingDaysPanelProps = {
	readonly selectedWeekdays: readonly number[];
	readonly disabled: boolean;
	readonly changed: boolean;
	readonly canManageCalendar: boolean;
	readonly onChange: (weekdays: readonly number[]) => void;
	readonly onSave: () => Promise<void>;
};

/**
 * WorkingDaysPanel renders weekday toggles for workspace working days.
 */
export function WorkingDaysPanel(props: WorkingDaysPanelProps): ReactElement {
	return (
		<section className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5">
			<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-3">
				<div>
					<p className="cf:text-sm cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
						Working days
					</p>
					<h3 className="cf:mt-1 cf:text-xl cf:font-black cf:tracking-[-0.03em] cf:text-foreground">
						Choose active workdays
					</h3>
				</div>

				<CampfireStatusPill tone={props.changed ? 'ember' : 'green'}>
					{props.changed ? 'Unsaved changes' : 'Saved'}
				</CampfireStatusPill>
			</div>

			<div className="cf:grid cf:gap-3 cf:sm:grid-cols-2 cf:xl:grid-cols-7">
				{weekdayOptions.map(option => {
					const active = props.selectedWeekdays.includes(option.weekday);

					return (
						<button
							key={option.weekday}
							type="button"
							className={weekdayButtonClassName(active)}
							disabled={props.disabled || !props.canManageCalendar}
							onClick={() => props.onChange(toggleWeekday(props.selectedWeekdays, option.weekday))}
						>
							<span className="cf:text-2xl cf:font-black cf:text-foreground">{option.shortName}</span>
							<span className="cf:text-sm cf:font-semibold cf:text-muted-foreground">
								{option.longName}
							</span>
							<span className="cf:text-xs cf:font-black cf:uppercase cf:tracking-widest cf:text-amber-200">
								{active ? 'Working' : 'Off'}
							</span>
						</button>
					);
				})}
			</div>

			<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4">
				<p className="cf:text-sm cf:font-semibold cf:leading-6 cf:text-muted-foreground">
					Weekly reports and standup runtime decisions depend on these days.
				</p>

				<Button
					type="button"
					disabled={props.disabled || !props.canManageCalendar || !props.changed}
					onClick={() => void props.onSave()}
				>
					<Save className="cf:size-4" />
					Save working days
				</Button>
			</div>
		</section>
	);
}
