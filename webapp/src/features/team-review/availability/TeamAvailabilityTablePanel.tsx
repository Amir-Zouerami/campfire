import { useState, type ReactElement } from 'react';
import { Umbrella } from 'lucide-react';

import { CampfireBidiText } from '@/components/campfire/CampfireBidiText';
import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireEmpty, CampfireStatusPill } from '@/components/campfire/CampfireLayoutPrimitives';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { CampfireTimeInput } from '@/components/campfire/CampfireTimeInput';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';
import { sortByNewest } from '@/lib/sort';
import type { ApprovedLeaveRequest, LeaveDurationMode, LeaveRequest, TimeOfDay } from '@/types/domain';

import { leaveDurationModes } from '@/features/my-day/leave/my-leave.helpers';
import { formatLocalizedLeaveDurationDetails, leaveDurationModeTranslationKey, localizedLeaveTypeName } from '@/features/my-day/leave/my-leave.i18n';
import { errorToMessage, formatLeaveRange } from './team-availability.helpers';
import { formatWorkspaceDateTime } from '../team-review-formatting';
import type { TeamAvailabilityLeaveEditPatch } from './useTeamAvailability';

/**
 * TeamAvailabilityTablePanelProps contains approved leave rows for the selected range.
 */
type TeamAvailabilityTablePanelProps = {
	readonly rows: readonly ApprovedLeaveRequest[];
	readonly timezone: string;
	readonly workingDays: readonly number[];
	readonly disabled: boolean;
	readonly labelForUserID: (userID: string) => string;
	readonly onEditLeaveRequest: (
		leaveRequest: LeaveRequest,
		patch: TeamAvailabilityLeaveEditPatch,
	) => Promise<void>;
	readonly onCancelLeaveRequest: (leaveRequestID: string) => Promise<void>;
};

type AvailabilityEditDraft = {
	readonly startDate: string;
	readonly endDate: string;
	readonly durationMode: LeaveDurationMode;
	readonly startTime: TimeOfDay | '';
	readonly endTime: TimeOfDay | '';
};

/**
 * TeamAvailabilityTablePanel renders the selected range's approved leave rows.
 */
export function TeamAvailabilityTablePanel(props: TeamAvailabilityTablePanelProps): ReactElement {
	const { t } = useI18n();
	const rows = sortByNewest(props.rows, row => newestLeaveDateValue(row.leaveRequest));

	return (
		<section className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5">
			<div>
				<p className="cf:m-0 cf:text-sm cf:font-semibold cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
					{t('teamReview.availability.table.eyebrow')}
				</p>
				<h3 className="cf:m-0 cf:mt-1 cf:text-xl cf:font-semibold cf:tracking-[-0.03em] cf:text-foreground">
					{t('teamReview.availability.table.title')}
				</h3>
			</div>

			{rows.length === 0 ? (
				<CampfireEmpty
					icon={Umbrella}
					title={t('teamReview.availability.empty.range.title')}
					description={t('teamReview.availability.empty.range.description')}
				/>
			) : (
				<div className="campfire-bounded-result-list campfire-bounded-result-list--tall cf:grid cf:gap-3">
					{rows.map(row => (
						<AvailabilityRow
							key={row.leaveRequest.id}
							row={row}
							timezone={props.timezone}
							workingDays={props.workingDays}
							disabled={props.disabled}
							labelForUserID={props.labelForUserID}
							onEditLeaveRequest={props.onEditLeaveRequest}
							onCancelLeaveRequest={props.onCancelLeaveRequest}
						/>
					))}
				</div>
			)}
		</section>
	);
}

/**
 * newestLeaveDateValue returns the newest meaningful timestamp for sorting availability rows.
 */
function newestLeaveDateValue(request: LeaveRequest): string {
	return request.updatedAt || request.createdAt || request.startDate || request.endDate;
}

/**
 * AvailabilityRow renders one approved leave row.
 */
function AvailabilityRow(props: {
	readonly row: ApprovedLeaveRequest;
	readonly timezone: string;
	readonly workingDays: readonly number[];
	readonly disabled: boolean;
	readonly labelForUserID: (userID: string) => string;
	readonly onEditLeaveRequest: (
		leaveRequest: LeaveRequest,
		patch: TeamAvailabilityLeaveEditPatch,
	) => Promise<void>;
	readonly onCancelLeaveRequest: (leaveRequestID: string) => Promise<void>;
}): ReactElement {
	const { htmlLang, t } = useI18n();
	const request = props.row.leaveRequest;
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState<AvailabilityEditDraft>(() => editDraftFromLeaveRequest(request));
	const [saving, setSaving] = useState(false);
	const [cancelling, setCancelling] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const backupLabel = request.backupUserId.trim() === ''
		? t('common.notSet')
		: props.labelForUserID(request.backupUserId);
	const createdAtLabel = formatWorkspaceDateTime(request.createdAt, props.timezone, htmlLang, t('common.unknown'));
	const rowDisabled = props.disabled || saving || cancelling;

	async function saveEdit(): Promise<void> {
		setSaving(true);
		setErrorMessage('');
		try {
			await props.onEditLeaveRequest(request, normalizeEditDraft(draft));
			setEditing(false);
		} catch (error: unknown) {
			setErrorMessage(errorToMessage(error, t('teamReview.availability.edit.error')));
		} finally {
			setSaving(false);
		}
	}

	async function cancelLeave(): Promise<void> {
		setCancelling(true);
		setErrorMessage('');
		try {
			await props.onCancelLeaveRequest(request.id);
		} catch (error: unknown) {
			setErrorMessage(errorToMessage(error, t('teamReview.availability.edit.error')));
		} finally {
			setCancelling(false);
		}
	}

	function cancelEdit(): void {
		setDraft(editDraftFromLeaveRequest(request));
		setErrorMessage('');
		setEditing(false);
	}

	return (
		<article className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4 cf:lg:grid-cols-[1fr_14rem]">
			<div className="cf:min-w-0">
				<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
					<h4 className="cf:m-0 cf:min-w-0 cf:truncate cf:text-base cf:font-semibold cf:text-foreground">
						<CampfireBidiText>{props.labelForUserID(request.userId)}</CampfireBidiText>
					</h4>
					<CampfireStatusPill tone="green">{t('myDay.leave.status.approved')}</CampfireStatusPill>
				</div>

				<p className="cf:m-0 cf:mt-2 cf:text-sm cf:font-semibold cf:text-muted-foreground">
					<CampfireBidiText>{localizedLeaveTypeName({ code: '', name: props.row.leaveTypeName }, t)}</CampfireBidiText>
					{' · '}
					<CampfireBidiText>{formatLeaveRange(request)}</CampfireBidiText>
				</p>

				<div className="cf:mt-3 cf:flex cf:flex-wrap cf:gap-2">
					<AvailabilityChip
						label={t('myDay.leave.field.duration')}
						value={formatLocalizedLeaveDurationDetails(request, t)}
					/>
					<AvailabilityChip label={t('myDay.leave.meta.backup')} value={backupLabel} />
				</div>

				{editing && (
					<div className="campfire-availability-edit-panel cf:mt-4 cf:grid cf:gap-3 cf:rounded-2xl cf:border cf:border-amber-400/20 cf:bg-amber-400/[0.045] cf:p-3">
						<p className="cf:m-0 cf:text-sm cf:font-bold cf:text-amber-100">
							{t('teamReview.availability.edit.title')}
						</p>
						<div className="cf:grid cf:gap-3 cf:md:grid-cols-2">
							<CampfireField id={`campfire-leave-edit-start-${request.id}`} label={t('teamReview.availability.edit.startDate')}>
								<CampfireDateInput
									id={`campfire-leave-edit-start-${request.id}`}
									disabled={rowDisabled}
									timezone={props.timezone}
									workingDays={props.workingDays}
									value={draft.startDate}
									onValueChange={value => setDraft(current => ({ ...current, startDate: value }))}
								/>
							</CampfireField>

							<CampfireField id={`campfire-leave-edit-end-${request.id}`} label={t('teamReview.availability.edit.endDate')}>
								<CampfireDateInput
									id={`campfire-leave-edit-end-${request.id}`}
									disabled={rowDisabled}
									timezone={props.timezone}
									workingDays={props.workingDays}
									value={draft.endDate}
									onValueChange={value => setDraft(current => ({ ...current, endDate: value }))}
								/>
							</CampfireField>
						</div>

						<CampfireField id={`campfire-leave-edit-duration-${request.id}`} label={t('teamReview.availability.edit.duration')}>
							<CampfireSelect
								id={`campfire-leave-edit-duration-${request.id}`}
								disabled={rowDisabled}
								value={draft.durationMode}
								onValueChange={value => setDraft(current => ({
									...current,
									durationMode: value as LeaveDurationMode,
								}))}
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
								<CampfireField id={`campfire-leave-edit-start-time-${request.id}`} label={t('teamReview.availability.edit.startTime')}>
									<CampfireTimeInput
										id={`campfire-leave-edit-start-time-${request.id}`}
										disabled={rowDisabled}
										value={draft.startTime}
										onValueChange={value => setDraft(current => ({ ...current, startTime: value }))}
									/>
								</CampfireField>

								<CampfireField id={`campfire-leave-edit-end-time-${request.id}`} label={t('teamReview.availability.edit.endTime')}>
									<CampfireTimeInput
										id={`campfire-leave-edit-end-time-${request.id}`}
										disabled={rowDisabled}
										value={draft.endTime}
										onValueChange={value => setDraft(current => ({ ...current, endTime: value }))}
									/>
								</CampfireField>
							</div>
						)}

						{errorMessage !== '' && (
							<p className="cf:m-0 cf:text-sm cf:font-semibold cf:text-red-200">
								<CampfireBidiText>{errorMessage}</CampfireBidiText>
							</p>
						)}

						<div className="cf:flex cf:flex-wrap cf:justify-end cf:gap-2">
							<Button type="button" variant="secondary" disabled={rowDisabled} onClick={cancelEdit}>
								{t('teamReview.availability.edit.cancel')}
							</Button>
							<Button type="button" disabled={rowDisabled} onClick={() => void saveEdit()}>
								{saving ? t('common.saving') : t('teamReview.availability.edit.save')}
							</Button>
						</div>
					</div>
				)}
			</div>

			<div className="cf:grid cf:gap-3">
				<div className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-3">
					<p className="cf:m-0 cf:text-sm cf:font-semibold cf:uppercase cf:tracking-[0.18em] cf:text-amber-200">
						{t('teamReview.availability.meta.created')}
					</p>
					<p
						className="cf:m-0 cf:mt-2 cf:truncate cf:text-sm cf:font-bold cf:text-slate-200"
						title={createdAtLabel}
					>
						<CampfireBidiText>{createdAtLabel}</CampfireBidiText>
					</p>
				</div>
				<div className="cf:flex cf:flex-wrap cf:justify-end cf:gap-2">
					<Button
						type="button"
						variant="secondary"
						disabled={rowDisabled}
						onClick={() => setEditing(current => !current)}
					>
						{editing ? t('teamReview.availability.edit.hide') : t('teamReview.availability.edit.open')}
					</Button>
					<Button
						type="button"
						variant="secondary"
						disabled={rowDisabled}
						onClick={() => void cancelLeave()}
					>
						{cancelling ? t('common.saving') : t('myDay.leave.action.cancel')}
					</Button>
				</div>
			</div>
		</article>
	);
}

/**
 * AvailabilityChip renders compact availability metadata.
 */
function AvailabilityChip(props: {
	readonly label: string;
	readonly value: string;
}): ReactElement {
	return (
		<span className="cf:max-w-full cf:truncate cf:rounded-full cf:border cf:border-emerald-300/20 cf:bg-emerald-300/10 cf:px-2.5 cf:py-1 cf:text-xs cf:font-semibold cf:text-emerald-100">
			{props.label}: <CampfireBidiText>{props.value}</CampfireBidiText>
		</span>
	);
}

/**
 * editDraftFromLeaveRequest creates a row-local edit draft from current request data.
 */
function editDraftFromLeaveRequest(request: LeaveRequest): AvailabilityEditDraft {
	return {
		startDate: request.startDate,
		endDate: request.endDate,
		durationMode: request.durationMode === 'half_day' ? 'full_day' : request.durationMode,
		startTime: request.startTime,
		endTime: request.endTime,
	};
}

/**
 * normalizeEditDraft clears fields that do not apply to the selected duration.
 */
function normalizeEditDraft(draft: AvailabilityEditDraft): TeamAvailabilityLeaveEditPatch {
	if (draft.durationMode === 'full_day') {
		return {
			...draft,
			startTime: '',
			endTime: '',
		};
	}

	return draft;
}