import type { ReactElement } from 'react';
import { CalendarDays, Umbrella } from 'lucide-react';

import { CampfireBidiText } from '@/components/campfire/CampfireBidiText';
import { CampfireEmpty, CampfireStatusPill } from '@/components/campfire/CampfireLayoutPrimitives';
import { useI18n } from '@/i18n';
import type { ApprovedLeaveRequest } from '@/types/domain';

import { formatLocalizedLeaveDurationDetails, localizedLeaveTypeName } from '@/features/my-day/leave/my-leave.i18n';
import { formatLeaveRange } from './team-availability.helpers';

/**
 * TeamAvailabilitySummaryPanelProps contains today/week availability rows.
 */
type TeamAvailabilitySummaryPanelProps = {
	readonly title: string;
	readonly description: string;
	readonly rows: readonly ApprovedLeaveRequest[];
	readonly labelForUserID: (userID: string) => string;
};

/**
 * TeamAvailabilitySummaryPanel renders a compact availability summary.
 */
export function TeamAvailabilitySummaryPanel(props: TeamAvailabilitySummaryPanelProps): ReactElement {
	const { t } = useI18n();

	return (
		<section className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5">
			<div>
				<p className="cf:text-sm cf:font-semibold cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
					{props.title}
				</p>
				<h3 className="cf:mt-1 cf:text-xl cf:font-semibold cf:tracking-[-0.03em] cf:text-foreground">
					{props.description}
				</h3>
			</div>

			{props.rows.length === 0 ? (
				<CampfireEmpty
					icon={CalendarDays}
					title={t('teamReview.availability.empty.summary.title')}
					description={t('teamReview.availability.empty.summary.description')}
				/>
			) : (
				<div className="campfire-bounded-result-list cf:grid cf:gap-3">
					{props.rows.map(row => (
						<SummaryLeaveRow key={row.leaveRequest.id} row={row} labelForUserID={props.labelForUserID} />
					))}
				</div>
			)}
		</section>
	);
}

/**
 * SummaryLeaveRow renders one compact approved leave row.
 */
function SummaryLeaveRow(props: {
	readonly row: ApprovedLeaveRequest;
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	const { t } = useI18n();
	const request = props.row.leaveRequest;

	return (
		<article className="cf:flex cf:flex-col cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4">
			<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-2">
				<div className="cf:min-w-0">
					<strong className="cf:block cf:truncate cf:text-base cf:font-semibold cf:text-foreground">
						<CampfireBidiText>{props.labelForUserID(request.userId)}</CampfireBidiText>
					</strong>
					<p className="cf:mt-1 cf:text-sm cf:font-semibold cf:text-muted-foreground">
						<CampfireBidiText>{localizedLeaveTypeName({ code: '', name: props.row.leaveTypeName }, t)}</CampfireBidiText>
					</p>
				</div>

				<CampfireStatusPill tone="green">
					<Umbrella className="cf:size-3.5" />
					{t('myDay.leave.status.approved')}
				</CampfireStatusPill>
			</div>

			<p className="cf:text-sm cf:font-semibold cf:leading-6 cf:text-slate-300">
				<CampfireBidiText>{formatLeaveRange(request)}</CampfireBidiText>
				{' · '}
				{formatLocalizedLeaveDurationDetails(request, t)}
			</p>
		</article>
	);
}

