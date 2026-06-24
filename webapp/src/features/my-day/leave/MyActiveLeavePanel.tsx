import { useState, type ReactElement } from 'react';
import { Ban, Edit3, Umbrella } from 'lucide-react';

import { CampfireBidiText } from '@/components/campfire/CampfireBidiText';
import { CampfireCheckboxField } from '@/components/campfire/CampfireCheckboxField';
import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireEmpty, CampfireStatusPill } from '@/components/campfire/CampfireLayoutPrimitives';
import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireResponsiveInput, CampfireResponsiveTextarea } from '@/components/campfire/CampfireResponsiveInput';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { CampfireTimeInput } from '@/components/campfire/CampfireTimeInput';
import { Button } from '@/components/ui/button';
import { isolateBidiText, useI18n } from '@/i18n';
import { sortByNewest } from '@/lib/sort';
import type { LeaveDurationMode, LeaveRequest, LeaveType, PendingLeaveRequest } from '@/types/domain';

import { formatLeaveRange, leaveDurationModes, leaveStatusTone, normalizeLeaveDraftForMode } from './my-leave.helpers';
import { formatLocalizedLeaveDurationDetails, isSelectableLeaveType, leaveDurationModeTranslationKey, leaveStatusTranslationKey, localizedLeaveTypeName } from './my-leave.i18n';
import type { MyLeaveDraft, MyLeaveDraftPatch } from './my-leave.types';

/**
 * MyActiveLeavePanelProps contains the current user's active leave requests.
 */
type MyActiveLeavePanelProps = {
	readonly leaveRequests: readonly PendingLeaveRequest[];
	readonly leaveTypes: readonly LeaveType[];
	readonly disabled: boolean;
	readonly timezone: string;
	readonly workingDays: readonly number[];
	readonly onCancel: (leaveRequestId: string) => Promise<void>;
	readonly onRequestChange: (leaveRequestId: string, draft: MyLeaveDraft) => Promise<void>;
};

/**
 * MyActiveLeavePanel renders the current user's pending and approved leave requests.
 */
export function MyActiveLeavePanel(props: MyActiveLeavePanelProps): ReactElement {
	const { t } = useI18n();
	const leaveRequests = sortByNewest(props.leaveRequests, item => newestLeaveDateValue(item.leaveRequest));

	return (
		<section className="campfire-flat-work-panel">
			<div>
				<p className="campfire-page-eyebrow">{t('myDay.leave.active.eyebrow')}</p>
				<h3 className="campfire-surface-title">
					{t('myDay.leave.active.title')}
				</h3>
			</div>

			{leaveRequests.length === 0 ? (
				<CampfireEmpty
					icon={Umbrella}
					title={t('myDay.leave.empty.active.title')}
					description={t('myDay.leave.empty.active.description')}
				/>
			) : (
				<div className="cf:grid cf:gap-3">
					{leaveRequests.map(item => (
						<ActiveLeaveRow
							key={item.leaveRequest.id}
							item={item}
							leaveTypes={props.leaveTypes}
							disabled={props.disabled}
							timezone={props.timezone}
							workingDays={props.workingDays}
							onCancel={() => props.onCancel(item.leaveRequest.id)}
							onRequestChange={draft => props.onRequestChange(item.leaveRequest.id, draft)}
						/>
					))}
				</div>
			)}
		</section>
	);
}

/**
 * newestLeaveDateValue returns the newest meaningful timestamp for sorting leave rows.
 */
function newestLeaveDateValue(request: LeaveRequest): string {
	return request.updatedAt || request.createdAt || request.startDate || request.endDate;
}

/**
 * ActiveLeaveRow renders one personal leave request.
 */
function ActiveLeaveRow(props: {
	readonly item: PendingLeaveRequest;
	readonly leaveTypes: readonly LeaveType[];
	readonly disabled: boolean;
	readonly timezone: string;
	readonly workingDays: readonly number[];
	readonly onCancel: () => Promise<void>;
	readonly onRequestChange: (draft: MyLeaveDraft) => Promise<void>;
}): ReactElement {
	const { t } = useI18n();
	const request = props.item.leaveRequest;
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState<MyLeaveDraft>(() => draftFromLeaveRequest(request));
	const [savingEdit, setSavingEdit] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const editRequiresApproval = request.status === 'approved';
	const deleteRequiresApproval = approvedLeaveHasStarted(request, props.timezone);
	const cancelDisabled = props.disabled;
	const cancelTitle = deleteRequiresApproval ? t('myDay.leave.cancel.locked') : undefined;
	const cancelLabelKey = deleteRequiresApproval ? 'myDay.leave.action.requestDelete' : 'myDay.leave.action.cancel';
	const editTitleKey = editRequiresApproval ? 'myDay.leave.editRequest.title' : 'myDay.leave.editDirect.title';
	const editDescriptionKey = editRequiresApproval ? 'myDay.leave.editRequest.description' : 'myDay.leave.editDirect.description';
	const editOpenKey = editRequiresApproval ? 'myDay.leave.editRequest.open' : 'myDay.leave.editDirect.open';
	const editHideKey = editRequiresApproval ? 'myDay.leave.editRequest.hide' : 'myDay.leave.editDirect.hide';
	const editSubmitKey = editRequiresApproval ? 'myDay.leave.editRequest.submit' : 'myDay.leave.editDirect.submit';
	const selectableLeaveTypes = props.leaveTypes.filter(isSelectableLeaveType);
	const rowDisabled = props.disabled || savingEdit;

	/**
	 * updateDraft patches the inline edit request draft.
	 */
	function updateDraft(patch: MyLeaveDraftPatch): void {
		setDraft(current => normalizeLeaveDraftForMode({ ...current, ...patch }));
		setErrorMessage('');
	}

	/**
	 * submitEditRequest sends the proposed edit to approvers.
	 */
	async function submitEditRequest(): Promise<void> {
		setSavingEdit(true);
		setErrorMessage('');
		try {
			await props.onRequestChange(draft);
			setEditing(false);
		} catch (error: unknown) {
			setErrorMessage(error instanceof Error ? error.message : t('myDay.leave.error.fallback'));
		} finally {
			setSavingEdit(false);
		}
	}

	return (
		<article className="campfire-flat-list-row campfire-flat-list-row--with-action">
			<div className="cf:min-w-0">
				<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
					<h4 className="cf:min-w-0 cf:truncate cf:text-base cf:font-semibold cf:text-foreground">
						<CampfireBidiText>{localizedLeaveTypeName({ code: '', name: props.item.leaveTypeName }, t)}</CampfireBidiText>
					</h4>
					<CampfireStatusPill tone={leaveStatusTone(request.status)}>
						{t(leaveStatusTranslationKey(request.status))}
					</CampfireStatusPill>
				</div>

				<p className="cf:mt-2 cf:text-sm cf:font-semibold cf:leading-6 cf:text-muted-foreground">
					{isolateBidiText(formatLeaveRange(request))} · {formatLocalizedLeaveDurationDetails(request, t)}
				</p>

				<div className="cf:mt-3 cf:flex cf:flex-wrap cf:gap-2">
					<LeaveMetaChip label={t('myDay.leave.meta.backup')} value={request.backupUserId} />
					<LeaveMetaChip
						label={t('myDay.leave.meta.canContact')}
						value={request.canContactIfNeeded ? t('common.yes') : t('common.no')}
						alwaysVisible
					/>
					<LeaveMetaChip label={t('myDay.leave.meta.reason')} value={request.reason} />
				</div>

				{editing && (
					<div className="cf:mt-4 cf:grid cf:gap-3 cf:rounded-2xl cf:border cf:border-amber-300/20 cf:bg-amber-300/[0.055] cf:p-3">
						<p className="cf:m-0 cf:text-sm cf:font-bold cf:text-amber-50">
							{t(editTitleKey)}
						</p>
						<p className="cf:m-0 cf:text-xs cf:font-semibold cf:leading-6 cf:text-amber-100/80">
							{t(editDescriptionKey)}
						</p>

						<CampfireField id={`campfire-leave-edit-type-${request.id}`} label={t('myDay.leave.field.leaveType')}>
							<CampfireSelect
								id={`campfire-leave-edit-type-${request.id}`}
								disabled={rowDisabled}
								value={draft.leaveTypeId}
								onValueChange={value => updateDraft({ leaveTypeId: value })}
							>
								{selectableLeaveTypes.map(leaveType => (
									<option key={leaveType.id} value={leaveType.id}>
										{localizedLeaveTypeName(leaveType, t)}
									</option>
								))}
							</CampfireSelect>
						</CampfireField>

						<div className="cf:grid cf:gap-3 cf:md:grid-cols-2">
							<CampfireField id={`campfire-leave-edit-start-${request.id}`} label={t('myDay.leave.field.startDate')}>
								<CampfireDateInput
									id={`campfire-leave-edit-start-${request.id}`}
									disabled={rowDisabled}
									timezone={props.timezone}
									workingDays={props.workingDays}
									value={draft.startDate}
									onValueChange={value => updateDraft({ startDate: value })}
								/>
							</CampfireField>

							<CampfireField id={`campfire-leave-edit-end-${request.id}`} label={t('myDay.leave.field.endDate')}>
								<CampfireDateInput
									id={`campfire-leave-edit-end-${request.id}`}
									disabled={rowDisabled}
									timezone={props.timezone}
									workingDays={props.workingDays}
									value={draft.endDate}
									onValueChange={value => updateDraft({ endDate: value })}
								/>
							</CampfireField>
						</div>

						<CampfireField id={`campfire-leave-edit-duration-${request.id}`} label={t('myDay.leave.field.duration')}>
							<CampfireSelect
								id={`campfire-leave-edit-duration-${request.id}`}
								disabled={rowDisabled}
								value={draft.durationMode}
								onValueChange={value => updateDraft({ durationMode: value as LeaveDurationMode })}
							>
								{leaveDurationModes.map(mode => (
									<option key={mode} value={mode}>
										{t(leaveDurationModeTranslationKey(mode))}
									</option>
								))}
							</CampfireSelect>
						</CampfireField>

						{draft.durationMode === 'hourly' && (
							<div className="cf:grid cf:gap-3 cf:md:grid-cols-2">
								<CampfireField id={`campfire-leave-edit-start-time-${request.id}`} label={t('myDay.leave.field.startTime')}>
									<CampfireTimeInput id={`campfire-leave-edit-start-time-${request.id}`} disabled={rowDisabled} value={draft.startTime} onValueChange={value => updateDraft({ startTime: value })} />
								</CampfireField>

								<CampfireField id={`campfire-leave-edit-end-time-${request.id}`} label={t('myDay.leave.field.endTime')}>
									<CampfireTimeInput id={`campfire-leave-edit-end-time-${request.id}`} disabled={rowDisabled} value={draft.endTime} onValueChange={value => updateDraft({ endTime: value })} />
								</CampfireField>
							</div>
						)}

						<CampfireField id={`campfire-leave-edit-backup-${request.id}`} label={t('myDay.leave.field.backupUserId')}>
							<CampfireResponsiveInput id={`campfire-leave-edit-backup-${request.id}`} disabled={rowDisabled} value={draft.backupUserId} onValueChange={value => updateDraft({ backupUserId: value })} />
						</CampfireField>

						<CampfireCheckboxField
							checked={draft.canContactIfNeeded}
							disabled={rowDisabled}
							label={t('myDay.leave.field.canContact.label')}
							description={t('myDay.leave.field.canContact.description')}
							onCheckedChange={value => updateDraft({ canContactIfNeeded: value })}
						/>

						<CampfireField id={`campfire-leave-edit-reason-${request.id}`} label={t('myDay.leave.field.reason')}>
							<CampfireResponsiveTextarea id={`campfire-leave-edit-reason-${request.id}`} disabled={rowDisabled} value={draft.reason} onValueChange={value => updateDraft({ reason: value })} />
						</CampfireField>

						{errorMessage.trim() !== '' && (
							<p className="cf:m-0 cf:text-sm cf:font-semibold cf:text-red-200">{errorMessage}</p>
						)}

						<div className="cf:flex cf:flex-wrap cf:justify-end cf:gap-2">
							<Button type="button" variant="secondary" disabled={rowDisabled} onClick={() => setEditing(false)}>
								{t('common.cancel')}
							</Button>
							<Button type="button" disabled={rowDisabled} onClick={() => void submitEditRequest()}>
								{savingEdit ? t('common.saving') : t(editSubmitKey)}
							</Button>
						</div>
					</div>
				)}
			</div>

			<div className="cf:flex cf:flex-col cf:items-end cf:gap-2">
				<Button
					type="button"
					variant="secondary"
					disabled={props.disabled}
					onClick={() => setEditing(current => !current)}
				>
					<Edit3 className="cf:size-4" />
					{editing ? t(editHideKey) : t(editOpenKey)}
				</Button>
				<Button
					type="button"
					variant="secondary"
					disabled={cancelDisabled}
					title={cancelTitle}
					onClick={() => void props.onCancel()}
				>
					<Ban className="cf:size-4" />
					{t(cancelLabelKey)}
				</Button>
			</div>
		</article>
	);
}

/**
 * draftFromLeaveRequest converts an existing leave request into an edit-request draft.
 */
function draftFromLeaveRequest(request: LeaveRequest): MyLeaveDraft {
	return normalizeLeaveDraftForMode({
		leaveTypeId: request.leaveTypeId,
		startDate: request.startDate,
		endDate: request.endDate,
		durationMode: request.durationMode === 'half_day' ? 'full_day' : request.durationMode,
		halfDayPart: request.halfDayPart,
		startTime: request.startTime,
		endTime: request.endTime,
		reason: request.reason,
		backupUserId: request.backupUserId,
		canContactIfNeeded: request.canContactIfNeeded,
	});
}

/**
 * LeaveMetaChip renders optional leave metadata.
 */
function LeaveMetaChip(props: {
	readonly label: string;
	readonly value: string;
	readonly alwaysVisible?: boolean;
}): ReactElement | null {
	if (!props.alwaysVisible && props.value.trim() === '') {
		return null;
	}

	return (
		<span className="cf:max-w-full cf:truncate cf:rounded-full cf:border cf:border-emerald-300/20 cf:bg-emerald-300/10 cf:px-2.5 cf:py-1 cf:text-xs cf:font-semibold cf:text-emerald-100">
			{props.label}: <CampfireBidiText>{props.value}</CampfireBidiText>
		</span>
	);
}

/**
 * approvedLeaveHasStarted returns true after approved leave reaches its first workspace-local instant.
 */
function approvedLeaveHasStarted(request: LeaveRequest, timezone: string): boolean {
	if (request.status !== 'approved') {
		return false;
	}

	const startAt = getLeaveStartDateTime(request, timezone);
	if (startAt === null) {
		return false;
	}

	const now = Date.now();

	return now >= startAt.getTime();
}

/**
 * getLeaveStartDateTime returns the first instant covered by a leave request.
 */
function getLeaveStartDateTime(request: LeaveRequest, timezone: string): Date | null {
	let timeOfDay = '00:00';

	if (request.durationMode === 'hourly' && request.startTime.trim() !== '') {
		timeOfDay = request.startTime;
	}

	if (request.durationMode === 'half_day' && request.halfDayPart === 'afternoon') {
		timeOfDay = '12:00';
	}

	return zonedDateTimeToDate(request.startDate, timeOfDay, timezone);
}

/**
 * zonedDateTimeToDate converts a workspace-local YYYY-MM-DD and HH:mm value to
 * an absolute Date without relying on the browser's local timezone.
 */
function zonedDateTimeToDate(dateValue: string, timeValue: string, timezone: string): Date | null {
	const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue.trim());
	const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue.trim());
	if (dateMatch === null || timeMatch === null) {
		return null;
	}

	const year = Number.parseInt(dateMatch[1] ?? '', 10);
	const month = Number.parseInt(dateMatch[2] ?? '', 10);
	const day = Number.parseInt(dateMatch[3] ?? '', 10);
	const hour = Number.parseInt(timeMatch[1] ?? '', 10);
	const minute = Number.parseInt(timeMatch[2] ?? '', 10);
	if (![year, month, day, hour, minute].every(Number.isFinite)) {
		return null;
	}

	const targetUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
	let candidate = new Date(targetUtc);

	for (let attempt = 0; attempt < 2; attempt += 1) {
		const localParts = getDateTimePartsInTimezone(candidate, timezone);
		if (localParts === null) {
			return null;
		}

		const localAsUtc = Date.UTC(
			localParts.year,
			localParts.month - 1,
			localParts.day,
			localParts.hour,
			localParts.minute,
			0,
		);
		candidate = new Date(targetUtc - (localAsUtc - candidate.getTime()));
	}

	return candidate;
}

/**
 * getDateTimePartsInTimezone formats an instant into numeric date/time parts for
 * one IANA timezone.
 */
function getDateTimePartsInTimezone(date: Date, timezone: string): {
	readonly year: number;
	readonly month: number;
	readonly day: number;
	readonly hour: number;
	readonly minute: number;
} | null {
	try {
		const formatter = new Intl.DateTimeFormat('en-US', {
			timeZone: timezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23',
		});
		const parts = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));

		return {
			year: Number.parseInt(parts.year ?? '', 10),
			month: Number.parseInt(parts.month ?? '', 10),
			day: Number.parseInt(parts.day ?? '', 10),
			hour: Number.parseInt(parts.hour ?? '', 10),
			minute: Number.parseInt(parts.minute ?? '', 10),
		};
	} catch (_error: unknown) {
		return null;
	}
}