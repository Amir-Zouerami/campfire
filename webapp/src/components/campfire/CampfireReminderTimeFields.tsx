import type { ReactElement } from 'react';
import { Clock3, X } from 'lucide-react';

import { CampfireTimeInput } from './CampfireTimeInput';

/**
 * CampfireReminderTimeFieldsProps contains open/close context and up to three reminder times.
 */
export type CampfireReminderTimeFieldsProps = {
	readonly idPrefix: string;
	readonly openTime: string;
	readonly closeTime: string;
	readonly reminderTimes: readonly string[];
	readonly disabled?: boolean;
	readonly validationMessage?: string;
	readonly onReminderTimeChange: (index: number, value: string) => void;
};

/**
 * CampfireReminderTimeFields renders a compact, human-friendly reminder-time editor.
 */
export function CampfireReminderTimeFields(props: CampfireReminderTimeFieldsProps): ReactElement {
	const values = reminderTimeValues(props.reminderTimes);

	return (
		<div className="campfire-reminder-time-editor">
			<div className="campfire-reminder-window-card">
				<span className="campfire-reminder-window-icon" aria-hidden="true">
					<Clock3 className="cf:size-5" />
				</span>

				<div>
					<p className="campfire-reminder-window-kicker">Standup window</p>
					<p className="campfire-reminder-window-title">
						Open <strong>{props.openTime}</strong> · close <strong>{props.closeTime}</strong>
					</p>
				</div>
			</div>

			<div className="campfire-reminder-time-grid" aria-label="Reminder times">
				{values.map((value, index) => (
					<label key={index} className="campfire-reminder-time-field">
						<span>Reminder {index + 1}</span>
						<div className="campfire-reminder-time-control-row">
							<CampfireTimeInput
								id={`${props.idPrefix}-reminder-${index + 1}`}
								disabled={props.disabled}
								value={value}
								onValueChange={nextValue => props.onReminderTimeChange(index, nextValue)}
							/>
							<button
								type="button"
								disabled={props.disabled || value.trim() === ''}
								className="campfire-reminder-time-clear"
								aria-label={`Clear reminder ${index + 1}`}
								onClick={() => props.onReminderTimeChange(index, '')}
							>
								<X className="cf:size-4" />
							</button>
						</div>
					</label>
				))}
			</div>

			{props.validationMessage !== undefined && props.validationMessage.trim() !== '' && (
				<p className="campfire-reminder-time-warning">{props.validationMessage}</p>
			)}
		</div>
	);
}

/**
 * reminderTimeValues returns exactly three editable reminder slots.
 */
function reminderTimeValues(values: readonly string[]): readonly string[] {
	return [values[0] ?? '', values[1] ?? '', values[2] ?? ''];
}
