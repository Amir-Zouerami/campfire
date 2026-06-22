import type { FormEvent, ReactElement } from 'react';
import { CalendarPlus } from 'lucide-react';

import { CampfireCheckboxField } from '@/components/campfire/CampfireCheckboxField';
import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireResponsiveInput, CampfireResponsiveTextarea } from '@/components/campfire/CampfireResponsiveInput';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { CampfireTimeInput } from '@/components/campfire/CampfireTimeInput';
import { Button } from '@/components/ui/button';
import { isolateBidiText, useI18n } from '@/i18n';
import type { LeaveDurationMode, LeaveType } from '@/types/domain';

import { leaveDurationModes } from './my-leave.helpers';
import { isSelectableLeaveType, leaveDurationModeTranslationKey, localizedLeaveTypeName } from './my-leave.i18n';
import type { MyLeaveDraft, MyLeaveDraftPatch } from './my-leave.types';

/**
 * MyLeaveRequestPanelProps contains request-leave form state and actions.
 */
type MyLeaveRequestPanelProps = {
	readonly draft: MyLeaveDraft;
	readonly leaveTypes: readonly LeaveType[];
	readonly disabled: boolean;
	readonly timezone: string;
	readonly workingDays: readonly number[];
	readonly onChange: (patch: MyLeaveDraftPatch) => void;
	readonly onSubmit: () => Promise<void>;
};

/**
 * MyLeaveRequestPanel renders the focused personal leave request form.
 */
export function MyLeaveRequestPanel(props: MyLeaveRequestPanelProps): ReactElement {
	const { t } = useI18n();
	const selectableLeaveTypes = props.leaveTypes.filter(isSelectableLeaveType);

	/**
	 * handleSubmit submits the request-leave form.
	 */
	function handleSubmit(event: FormEvent<HTMLFormElement>): void {
		event.preventDefault();
		void props.onSubmit();
	}

	return (
		<form
			className="campfire-flat-work-panel campfire-flat-work-panel--form"
			onSubmit={handleSubmit}
		>
			<div>
				<p className="campfire-page-eyebrow">
					{t('myDay.leave.request.eyebrow')}
				</p>
				<h3 className="campfire-surface-title">
					{t('myDay.leave.request.title')}
				</h3>
			</div>

			<div className="cf:grid cf:gap-4">
				<CampfireField id="campfire-my-leave-type" label={t('myDay.leave.field.leaveType')}>
					<CampfireSelect
						id="campfire-my-leave-type"
						disabled={props.disabled}
						value={props.draft.leaveTypeId}
						onValueChange={value => props.onChange({ leaveTypeId: value })}
					>
						<option value="">{t('myDay.leave.field.leaveType.placeholder')}</option>
						{selectableLeaveTypes.map(leaveType => (
							<option key={leaveType.id} value={leaveType.id}>
								{localizedLeaveTypeName(leaveType, t)}
							</option>
						))}
					</CampfireSelect>
				</CampfireField>

				<div className="cf:grid cf:gap-4 cf:md:grid-cols-2">
					<CampfireField id="campfire-my-leave-start" label={t('myDay.leave.field.startDate')}>
						<CampfireDateInput
							id="campfire-my-leave-start"
							disabled={props.disabled}
							timezone={props.timezone}
							workingDays={props.workingDays}
							value={props.draft.startDate}
							onValueChange={value => props.onChange({ startDate: value })}
						/>
					</CampfireField>

					<CampfireField id="campfire-my-leave-end" label={t('myDay.leave.field.endDate')}>
						<CampfireDateInput
							id="campfire-my-leave-end"
							disabled={props.disabled}
							timezone={props.timezone}
							workingDays={props.workingDays}
							value={props.draft.endDate}
							onValueChange={value => props.onChange({ endDate: value })}
						/>
					</CampfireField>
				</div>

				<CampfireField id="campfire-my-leave-duration" label={t('myDay.leave.field.duration')}>
					<CampfireSelect
						id="campfire-my-leave-duration"
						disabled={props.disabled}
						value={props.draft.durationMode}
						onValueChange={value => props.onChange({ durationMode: value as LeaveDurationMode })}
					>
						{leaveDurationModes.map(mode => (
							<option key={mode} value={mode}>
								{t(leaveDurationModeTranslationKey(mode))}
							</option>
						))}
					</CampfireSelect>
				</CampfireField>

				{props.draft.durationMode === 'hourly' && (
					<div className="cf:grid cf:gap-4 cf:md:grid-cols-2">
						<CampfireField id="campfire-my-leave-start-time" label={t('myDay.leave.field.startTime')}>
							<CampfireTimeInput
								id="campfire-my-leave-start-time"
								disabled={props.disabled}
								value={props.draft.startTime}
								onValueChange={value => props.onChange({ startTime: value })}
							/>
						</CampfireField>

						<CampfireField id="campfire-my-leave-end-time" label={t('myDay.leave.field.endTime')}>
							<CampfireTimeInput
								id="campfire-my-leave-end-time"
								disabled={props.disabled}
								value={props.draft.endTime}
								onValueChange={value => props.onChange({ endTime: value })}
							/>
						</CampfireField>
					</div>
				)}

				<CampfireField id="campfire-my-leave-backup" label={t('myDay.leave.field.backupUserId')}>
					<CampfireResponsiveInput
						id="campfire-my-leave-backup"
						disabled={props.disabled}
						placeholder={t('myDay.leave.field.backupUserId.placeholder')}
						value={props.draft.backupUserId}
						onValueChange={value => props.onChange({ backupUserId: value })}
					/>
				</CampfireField>

				<CampfireCheckboxField
					checked={props.draft.canContactIfNeeded}
					disabled={props.disabled}
					label={t('myDay.leave.field.canContact.label')}
					description={t('myDay.leave.field.canContact.description')}
					onCheckedChange={value => props.onChange({ canContactIfNeeded: value })}
				/>

				<CampfireField id="campfire-my-leave-reason" label={t('myDay.leave.field.reason')}>
					<CampfireResponsiveTextarea
						id="campfire-my-leave-reason"
						disabled={props.disabled}
						placeholder={t('myDay.leave.field.reason.placeholder')}
						value={props.draft.reason}
						onValueChange={value => props.onChange({ reason: value })}
					/>
				</CampfireField>
			</div>

			<div className="cf:flex cf:justify-end">
				<Button type="submit" disabled={props.disabled || selectableLeaveTypes.length === 0}>
					<CalendarPlus className="cf:size-4" />
					{isolateBidiText(t('myDay.leave.action.request'))}
				</Button>
			</div>
		</form>
	);
}

