import type { ReactElement } from 'react';
import { Clock3, X } from 'lucide-react';

import { useI18n } from '@/i18n';
import type { TFunction } from '@/i18n';

import { CampfireTimeInput } from './CampfireTimeInput';

/**
 * CampfireReminderTimeFieldsLabels contains generated copy for the reminder editor.
 */
export type CampfireReminderTimeFieldsLabels = {
	readonly windowKicker: string;
	readonly windowTitle: (openTime: string, closeTime: string) => string;
	readonly gridAriaLabel: string;
	readonly reminderLabel: (position: number) => string;
	readonly clearReminderAriaLabel: (position: number) => string;
};

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
	readonly labels?: Partial<CampfireReminderTimeFieldsLabels>;
	readonly onReminderTimeChange: (index: number, value: string) => void;
};

/**
 * CampfireReminderTimeFields renders a compact, human-friendly reminder-time editor.
 */
export function CampfireReminderTimeFields(props: CampfireReminderTimeFieldsProps): ReactElement {
	const values = reminderTimeValues(props.reminderTimes);
	const { t } = useI18n();
	const labels = reminderTimeLabels(props.labels, t);

	return (
		<div className="campfire-reminder-time-editor">
			<div className="campfire-reminder-window-card">
				<span className="campfire-reminder-window-icon" aria-hidden="true">
					<Clock3 className="cf:size-5" />
				</span>

				<div>
					<p className="campfire-reminder-window-kicker">{labels.windowKicker}</p>
					<p className="campfire-reminder-window-title">{labels.windowTitle(props.openTime, props.closeTime)}</p>
				</div>
			</div>

			<div className="campfire-reminder-time-grid" aria-label={labels.gridAriaLabel}>
				{values.map((value, index) => {
					const position = index + 1;

					return (
						<label key={position} className="campfire-reminder-time-field">
							<span>{labels.reminderLabel(position)}</span>
							<div className="campfire-reminder-time-control-row">
								<CampfireTimeInput
									id={`${props.idPrefix}-reminder-${position}`}
									disabled={props.disabled}
									value={value}
									onValueChange={nextValue => props.onReminderTimeChange(index, nextValue)}
								/>
								<button
									type="button"
									disabled={props.disabled || value.trim() === ''}
									className="campfire-reminder-time-clear"
									aria-label={labels.clearReminderAriaLabel(position)}
									onClick={() => props.onReminderTimeChange(index, '')}
								>
									<X className="cf:size-4" />
								</button>
							</div>
						</label>
					);
				})}
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

/**
 * reminderTimeLabels merges caller-provided generated copy with stable defaults.
 */
function reminderTimeLabels(
	labels: Partial<CampfireReminderTimeFieldsLabels> | undefined,
	t: TFunction,
): CampfireReminderTimeFieldsLabels {
	return {
		windowKicker: labels?.windowKicker ?? t('shared.reminderTimes.windowKicker'),
		windowTitle: labels?.windowTitle ?? ((openTime: string, closeTime: string) =>
			t('shared.reminderTimes.windowTitle', { openTime, closeTime })),
		gridAriaLabel: labels?.gridAriaLabel ?? t('shared.reminderTimes.gridAriaLabel'),
		reminderLabel: labels?.reminderLabel ?? ((position: number) =>
			t('shared.reminderTimes.reminderLabel', { position: String(position) })),
		clearReminderAriaLabel: labels?.clearReminderAriaLabel ?? ((position: number) =>
			t('shared.reminderTimes.clearReminder', { position: String(position) })),
	};
}
