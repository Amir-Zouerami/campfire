import type { FormEvent, ReactElement } from 'react';
import { CalendarPlus } from 'lucide-react';

import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { CampfireTimeInput } from '@/components/campfire/CampfireTimeInput';
import { CampfireResponsiveInput, CampfireResponsiveTextarea } from '@/components/campfire/CampfireResponsiveInput';
import { Button } from '@/components/ui/button';
import type { LeaveDurationMode, LeaveHalfDayPart, LeaveType } from '@/types/domain';

import { formatDurationMode, formatLeaveOptionLabel, leaveDurationModes, leaveHalfDayParts } from './my-leave.helpers';
import type { MyLeaveDraft, MyLeaveDraftPatch } from './my-leave.types';

/**
 * MyLeaveRequestPanelProps contains request-leave form state and actions.
 */
type MyLeaveRequestPanelProps = {
	readonly draft: MyLeaveDraft;
	readonly leaveTypes: readonly LeaveType[];
	readonly disabled: boolean;
	readonly timezone: string;
	readonly onChange: (patch: MyLeaveDraftPatch) => void;
	readonly onSubmit: () => Promise<void>;
};

/**
 * MyLeaveRequestPanel renders the focused personal leave request form.
 */
export function MyLeaveRequestPanel(props: MyLeaveRequestPanelProps): ReactElement {
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
					Request leave
				</p>
				<h3 className="campfire-surface-title">
					Tell the team when you will be away
				</h3>
			</div>

			<div className="cf:grid cf:gap-4">
				<CampfireField id="campfire-my-leave-type" label="Leave type">
					<CampfireSelect
						id="campfire-my-leave-type"
						disabled={props.disabled}
						value={props.draft.leaveTypeId}
						onValueChange={value => props.onChange({ leaveTypeId: value })}
					>
						<option value="">Choose leave type…</option>
						{props.leaveTypes.map(leaveType => (
							<option key={leaveType.id} value={leaveType.id}>
								{leaveType.name}
							</option>
						))}
					</CampfireSelect>
				</CampfireField>

				<div className="cf:grid cf:gap-4 cf:md:grid-cols-2">
					<CampfireField id="campfire-my-leave-start" label="Start date">
						<CampfireDateInput
							id="campfire-my-leave-start"
							disabled={props.disabled}
							timezone={props.timezone}
							value={props.draft.startDate}
							onValueChange={value => props.onChange({ startDate: value })}
						/>
					</CampfireField>

					<CampfireField id="campfire-my-leave-end" label="End date">
						<CampfireDateInput
							id="campfire-my-leave-end"
							disabled={props.disabled}
							timezone={props.timezone}
							value={props.draft.endDate}
							onValueChange={value => props.onChange({ endDate: value })}
						/>
					</CampfireField>
				</div>

				<CampfireField id="campfire-my-leave-duration" label="Duration">
					<CampfireSelect
						id="campfire-my-leave-duration"
						disabled={props.disabled}
						value={props.draft.durationMode}
						onValueChange={value => props.onChange({ durationMode: value as LeaveDurationMode })}
					>
						{leaveDurationModes.map(mode => (
							<option key={mode} value={mode}>
								{formatDurationMode(mode)}
							</option>
						))}
					</CampfireSelect>
				</CampfireField>

				{props.draft.durationMode === 'half_day' && (
					<CampfireField id="campfire-my-leave-half-day" label="Half day part">
						<CampfireSelect
							id="campfire-my-leave-half-day"
							disabled={props.disabled}
							value={props.draft.halfDayPart}
							onValueChange={value => props.onChange({ halfDayPart: value as LeaveHalfDayPart | '' })}
						>
							<option value="">Choose…</option>
							{leaveHalfDayParts.map(part => (
								<option key={part} value={part}>
									{formatLeaveOptionLabel(part)}
								</option>
							))}
						</CampfireSelect>
					</CampfireField>
				)}

				{props.draft.durationMode === 'hourly' && (
					<div className="cf:grid cf:gap-4 cf:md:grid-cols-2">
						<CampfireField id="campfire-my-leave-start-time" label="Start time">
							<CampfireTimeInput
								id="campfire-my-leave-start-time"
								disabled={props.disabled}
								value={props.draft.startTime}
								onValueChange={value => props.onChange({ startTime: value })}
							/>
						</CampfireField>

						<CampfireField id="campfire-my-leave-end-time" label="End time">
							<CampfireTimeInput
								id="campfire-my-leave-end-time"
								disabled={props.disabled}
								value={props.draft.endTime}
								onValueChange={value => props.onChange({ endTime: value })}
							/>
						</CampfireField>
					</div>
				)}

				<CampfireField id="campfire-my-leave-backup" label="Backup person ID">
					<CampfireResponsiveInput
						id="campfire-my-leave-backup"
						disabled={props.disabled}
						placeholder="Optional Mattermost user ID"
						value={props.draft.backupUserId}
						onValueChange={value => props.onChange({ backupUserId: value })}
					/>
				</CampfireField>

				<CampfireField id="campfire-my-leave-reason" label="Reason">
					<CampfireResponsiveTextarea
						id="campfire-my-leave-reason"
						disabled={props.disabled}
						placeholder="Optional note for approvers."
						value={props.draft.reason}
						onValueChange={value => props.onChange({ reason: value })}
					/>
				</CampfireField>
			</div>

			<div className="cf:flex cf:justify-end">
				<Button type="submit" disabled={props.disabled || props.leaveTypes.length === 0}>
					<CalendarPlus className="cf:size-4" />
					Request leave
				</Button>
			</div>
		</form>
	);
}