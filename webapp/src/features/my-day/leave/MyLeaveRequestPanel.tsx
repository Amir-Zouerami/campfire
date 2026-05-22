import type { FormEvent, ReactElement } from 'react';
import { CalendarPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { LeaveDurationMode, LeaveHalfDayPart, LeaveType } from '@/types/domain';

import {
	formatDurationMode,
	formatLeaveOptionLabel,
	leaveDurationModes,
	leaveHalfDayParts,
	selectClassName,
} from './my-leave.helpers';
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
			className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5"
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
				<FormField label="Leave type" htmlFor="campfire-my-leave-type">
					<select
						id="campfire-my-leave-type"
						className={selectClassName()}
						disabled={props.disabled || props.leaveTypes.length === 0}
						value={props.draft.leaveTypeId}
						onChange={event => props.onChange({ leaveTypeId: event.currentTarget.value })}
					>
						<option value="">Choose leave type…</option>
						{props.leaveTypes.map(leaveType => (
							<option key={leaveType.id} value={leaveType.id}>
								{leaveType.name}
							</option>
						))}
					</select>
				</FormField>

				<div className="cf:grid cf:gap-4 cf:md:grid-cols-2">
					<FormField label="Start date" htmlFor="campfire-my-leave-start">
						<Input
							id="campfire-my-leave-start"
							type="date"
							disabled={props.disabled}
							value={props.draft.startDate}
							onChange={event => props.onChange({ startDate: event.currentTarget.value })}
						/>
					</FormField>

					<FormField label="End date" htmlFor="campfire-my-leave-end">
						<Input
							id="campfire-my-leave-end"
							type="date"
							disabled={props.disabled}
							value={props.draft.endDate}
							onChange={event => props.onChange({ endDate: event.currentTarget.value })}
						/>
					</FormField>
				</div>

				<FormField label="Duration" htmlFor="campfire-my-leave-duration">
					<select
						id="campfire-my-leave-duration"
						className={selectClassName()}
						disabled={props.disabled}
						value={props.draft.durationMode}
						onChange={event =>
							props.onChange({ durationMode: event.currentTarget.value as LeaveDurationMode })
						}
					>
						{leaveDurationModes.map(mode => (
							<option key={mode} value={mode}>
								{formatDurationMode(mode)}
							</option>
						))}
					</select>
				</FormField>

				{props.draft.durationMode === 'half_day' && (
					<FormField label="Half day part" htmlFor="campfire-my-leave-half-day">
						<select
							id="campfire-my-leave-half-day"
							className={selectClassName()}
							disabled={props.disabled}
							value={props.draft.halfDayPart}
							onChange={event =>
								props.onChange({ halfDayPart: event.currentTarget.value as LeaveHalfDayPart | '' })
							}
						>
							<option value="">Choose…</option>
							{leaveHalfDayParts.map(part => (
								<option key={part} value={part}>
									{formatLeaveOptionLabel(part)}{' '}
								</option>
							))}
						</select>
					</FormField>
				)}

				{props.draft.durationMode === 'hourly' && (
					<div className="cf:grid cf:gap-4 cf:md:grid-cols-2">
						<FormField label="Start time" htmlFor="campfire-my-leave-start-time">
							<Input
								id="campfire-my-leave-start-time"
								type="time"
								disabled={props.disabled}
								value={props.draft.startTime}
								onChange={event => props.onChange({ startTime: event.currentTarget.value })}
							/>
						</FormField>

						<FormField label="End time" htmlFor="campfire-my-leave-end-time">
							<Input
								id="campfire-my-leave-end-time"
								type="time"
								disabled={props.disabled}
								value={props.draft.endTime}
								onChange={event => props.onChange({ endTime: event.currentTarget.value })}
							/>
						</FormField>
					</div>
				)}

				<FormField label="Backup person ID" htmlFor="campfire-my-leave-backup">
					<Input
						id="campfire-my-leave-backup"
						disabled={props.disabled}
						placeholder="Optional Mattermost user ID"
						value={props.draft.backupUserId}
						onChange={event => props.onChange({ backupUserId: event.currentTarget.value })}
					/>
				</FormField>

				<FormField label="Reason" htmlFor="campfire-my-leave-reason">
					<Textarea
						id="campfire-my-leave-reason"
						disabled={props.disabled}
						placeholder="Optional note for approvers."
						value={props.draft.reason}
						onChange={event => props.onChange({ reason: event.currentTarget.value })}
					/>
				</FormField>
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

/**
 * FormField renders a consistent labeled form field.
 */
function FormField(props: {
	readonly label: string;
	readonly htmlFor: string;
	readonly children: ReactElement;
}): ReactElement {
	return (
		<div className="cf:grid cf:gap-2">
			<Label
				htmlFor={props.htmlFor}
				className="cf:text-xs cf:font-black cf:uppercase cf:tracking-widest cf:text-amber-200"
			>
				{props.label}
			</Label>
			{props.children}
		</div>
	);
}
