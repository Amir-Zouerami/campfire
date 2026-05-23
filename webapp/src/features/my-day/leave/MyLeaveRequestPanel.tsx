import type { FormEvent, ReactElement } from 'react';
import { CalendarPlus } from 'lucide-react';

import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
			className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5"
			onSubmit={handleSubmit}
		>
			<div>
				<p className="cf:text-sm cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
					Request leave
				</p>
				<h3 className="cf:mt-1 cf:text-xl cf:font-black cf:tracking-[-0.03em] cf:text-foreground">
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
							value={props.draft.startDate}
							onValueChange={value => props.onChange({ startDate: value })}
						/>
					</CampfireField>

					<CampfireField id="campfire-my-leave-end" label="End date">
						<CampfireDateInput
							id="campfire-my-leave-end"
							disabled={props.disabled}
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
							<Input
								id="campfire-my-leave-start-time"
								type="time"
								disabled={props.disabled}
								value={props.draft.startTime}
								onChange={event => props.onChange({ startTime: event.currentTarget.value })}
							/>
						</CampfireField>

						<CampfireField id="campfire-my-leave-end-time" label="End time">
							<Input
								id="campfire-my-leave-end-time"
								type="time"
								disabled={props.disabled}
								value={props.draft.endTime}
								onChange={event => props.onChange({ endTime: event.currentTarget.value })}
							/>
						</CampfireField>
					</div>
				)}

				<CampfireField id="campfire-my-leave-backup" label="Backup person ID">
					<Input
						id="campfire-my-leave-backup"
						disabled={props.disabled}
						placeholder="Optional Mattermost user ID"
						value={props.draft.backupUserId}
						onChange={event => props.onChange({ backupUserId: event.currentTarget.value })}
					/>
				</CampfireField>

				<CampfireField id="campfire-my-leave-reason" label="Reason">
					<Textarea
						id="campfire-my-leave-reason"
						disabled={props.disabled}
						placeholder="Optional note for approvers."
						value={props.draft.reason}
						onChange={event => props.onChange({ reason: event.currentTarget.value })}
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
