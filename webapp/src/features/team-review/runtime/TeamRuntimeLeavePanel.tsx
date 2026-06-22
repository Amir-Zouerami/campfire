import type { ReactElement } from 'react';
import { Umbrella } from 'lucide-react';

import { CampfireEmpty, CampfireStatusPill } from '@/components/campfire/CampfireLayoutPrimitives';
import { localizedLeaveTypeName } from '@/features/my-day/leave/my-leave.i18n';
import { useI18n } from '@/i18n';
import { sortByNewest } from '@/lib/sort';
import type { ApprovedLeaveRequest, LeaveRequest } from '@/types/domain';

import { formatLeaveRange } from './team-runtime.helpers';

/**
 * TeamRuntimeLeavePanelProps contains approved leave rows used by runtime evaluation.
 */
type TeamRuntimeLeavePanelProps = {
	readonly approvedLeaves: readonly ApprovedLeaveRequest[];
	readonly labelForUserID: (userID: string) => string;
};

/**
 * TeamRuntimeLeavePanel renders approved leave rows that affect runtime decisions.
 */
export function TeamRuntimeLeavePanel(props: TeamRuntimeLeavePanelProps): ReactElement {
	const { t } = useI18n();
	const approvedLeaves = sortByNewest(props.approvedLeaves, row => newestLeaveDateValue(row.leaveRequest));

	return (
		<section className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5">
			<div>
				<p className="cf:text-sm cf:font-semibold cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
					{t('teamReview.runtime.leave.eyebrow')}
				</p>
				<h3 className="cf:mt-1 cf:text-xl cf:font-semibold cf:tracking-[-0.03em] cf:text-foreground">
					{t('teamReview.runtime.leave.title')}
				</h3>
			</div>

			{approvedLeaves.length === 0 ? (
				<CampfireEmpty
					icon={Umbrella}
					title={t('teamReview.runtime.leave.empty.title')}
					description={t('teamReview.runtime.leave.empty.description')}
				/>
			) : (
				<div className="cf:grid cf:gap-3">
					{approvedLeaves.map(row => (
						<RuntimeLeaveRow
							key={row.leaveRequest.id}
							row={row}
							labelForUserID={props.labelForUserID}
						/>
					))}
				</div>
			)}
		</section>
	);
}

/**
 * newestLeaveDateValue returns the newest meaningful timestamp for sorting approved leave rows.
 */
function newestLeaveDateValue(request: LeaveRequest): string {
	return request.updatedAt || request.createdAt || request.startDate || request.endDate;
}

/**
 * RuntimeLeaveRow renders one approved leave row used by runtime.
 */
function RuntimeLeaveRow(props: {
	readonly row: ApprovedLeaveRequest;
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	const { t } = useI18n();
	const request = props.row.leaveRequest;
	const backupLabel = request.backupUserId.trim() === ''
		? t('common.notSet')
		: props.labelForUserID(request.backupUserId);

	return (
		<article className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4 cf:lg:grid-cols-[1fr_auto]">
			<div className="cf:min-w-0">
				<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
					<strong className="cf:min-w-0 cf:truncate cf:text-base cf:font-semibold cf:text-foreground">
						{props.labelForUserID(request.userId)}
					</strong>
					<CampfireStatusPill tone="green">{t('teamReview.runtime.leave.approved')}</CampfireStatusPill>
				</div>

				<p className="cf:mt-2 cf:text-sm cf:font-semibold cf:text-muted-foreground">
					{localizedLeaveTypeName({ code: '', name: props.row.leaveTypeName }, t)} · {formatLeaveRange(props.row)} · {formatLeaveDuration(props.row, t)}
				</p>

				<p className="cf:mt-2 cf:text-xs cf:font-bold cf:text-slate-400">
					{t('teamReview.runtime.leave.backup', { backup: backupLabel })}
				</p>
			</div>

			<CampfireStatusPill tone="slate">
				<Umbrella className="cf:size-3.5" />
				{t('teamReview.runtime.leave.runtimeInput')}
			</CampfireStatusPill>
		</article>
	);
}

/**
 * formatLeaveDuration returns localized duration-specific leave details.
 */
function formatLeaveDuration(
	leave: ApprovedLeaveRequest,
	t: (key: 'teamReview.runtime.leave.duration.fullDay' | 'teamReview.runtime.leave.duration.halfDay' | 'teamReview.runtime.leave.duration.halfDayPart', values?: { readonly part: string }) => string,
): string {
	const request = leave.leaveRequest;

	switch (request.durationMode) {
		case 'half_day':
			return request.halfDayPart === ''
				? t('teamReview.runtime.leave.duration.halfDay')
				: t('teamReview.runtime.leave.duration.halfDayPart', { part: formatHalfDayPart(request.halfDayPart) });

		case 'hourly':
			return `${request.startTime} → ${request.endTime}`;

		case 'full_day':
			return t('teamReview.runtime.leave.duration.fullDay');
	}
}

/**
 * formatHalfDayPart returns a readable half-day part label.
 */
function formatHalfDayPart(value: string): string {
	return value
		.split('_')
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

