import type { ReactElement } from 'react';
import { CalendarCheck2, CalendarX2, Globe2, Umbrella, Users } from 'lucide-react';

import { CampfireStatusPill } from '@/components/campfire/CampfireLayoutPrimitives';
import { useI18n } from '@/i18n';
import type { StandupRunDecision } from '@/types/domain';

import { runtimeSignalCardClassName } from './team-runtime.helpers';
import {
	runtimeDecisionBadgeLabel,
	runtimeFallbackMessage,
	runtimeReasonDescription,
	runtimeReasonLabel,
	runtimeSignalStateLabel,
} from './team-runtime.i18n';

/**
 * TeamRuntimeDecisionPanelProps contains one evaluated runtime decision.
 */
type TeamRuntimeDecisionPanelProps = {
	readonly decision: StandupRunDecision;
};

/**
 * TeamRuntimeDecisionPanel renders the evaluated runtime signals.
 */
export function TeamRuntimeDecisionPanel(props: TeamRuntimeDecisionPanelProps): ReactElement {
	const { t } = useI18n();
	const decisionTone = props.decision.shouldRun ? 'green' : 'red';

	return (
		<section className="campfire-runtime-decision-flow">
			<article className="campfire-runtime-message-panel">
				<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-3">
					<div className="cf:min-w-0">
						<p className="cf:m-0 cf:text-sm cf:font-semibold cf:uppercase cf:leading-none cf:tracking-[0.18em] cf:text-amber-100">
							{t('teamReview.runtime.message.eyebrow')}
						</p>
						<h3 className="cf:m-0 cf:mt-3 cf:text-2xl cf:font-semibold cf:leading-tight cf:tracking-[-0.04em] cf:text-foreground">
							{props.decision.shouldRun
								? t('teamReview.runtime.message.shouldRun')
								: t('teamReview.runtime.message.shouldSkip')}
						</h3>
					</div>

					<CampfireStatusPill tone={decisionTone}>
						{runtimeDecisionBadgeLabel(props.decision, t)}
					</CampfireStatusPill>
				</div>

				<p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-semibold cf:leading-7 cf:text-slate-300">
					{props.decision.message || runtimeFallbackMessage(props.decision, t)}
				</p>
			</article>

			<div className="campfire-runtime-signal-grid">
				<RuntimeSignalCard
					title={t('teamReview.runtime.signal.workingDay')}
					value={props.decision.isWorkingDay ? t('common.yes') : t('common.no')}
					active={!props.decision.isWorkingDay}
					icon={props.decision.isWorkingDay ? CalendarCheck2 : CalendarX2}
				/>
				<RuntimeSignalCard
					title={t('teamReview.runtime.signal.globalOffDays')}
					value={String(props.decision.globalOffDays.length)}
					active={props.decision.globalOffDays.length > 0}
					icon={Globe2}
				/>
				<RuntimeSignalCard
					title={t('teamReview.runtime.signal.workspaceOffDays')}
					value={String(props.decision.workspaceOffDays.length)}
					active={props.decision.workspaceOffDays.length > 0}
					icon={CalendarX2}
				/>
				<RuntimeSignalCard
					title={t('teamReview.runtime.signal.leaveCoverage')}
					value={`${props.decision.onLeaveMemberCount}/${props.decision.memberCount}`}
					active={
						props.decision.memberCount > 0 &&
						props.decision.onLeaveMemberCount >= props.decision.memberCount
					}
					icon={Users}
				/>
				<RuntimeSignalCard
					title={t('teamReview.runtime.signal.excluded')}
					value={String(props.decision.excludedMemberCount)}
					active={props.decision.excludedMemberCount > 0}
					icon={Users}
				/>
			</div>

			<article className="campfire-runtime-reason-panel">
				<div className="campfire-icon-tile campfire-runtime-reason-icon">
					<Umbrella className="cf:size-6" />
				</div>

				<div className="cf:min-w-0">
					<p className="cf:m-0 cf:text-sm cf:font-semibold cf:uppercase cf:leading-none cf:tracking-[0.18em] cf:text-amber-100">
						{t('teamReview.runtime.reason.eyebrow')}
					</p>

					<h3 className="cf:m-0 cf:mt-3 cf:text-2xl cf:font-semibold cf:leading-tight cf:tracking-[-0.04em] cf:text-foreground">
						{runtimeReasonLabel(props.decision.reason, t)}
					</h3>

					<p className="cf:m-0 cf:mt-3 cf:text-sm cf:font-semibold cf:leading-7 cf:text-slate-300">
						{runtimeReasonDescription(props.decision.reason, t)}
					</p>
				</div>
			</article>
		</section>
	);
}

/**
 * RuntimeSignalCard renders one runtime input signal.
 */
function RuntimeSignalCard(props: {
	readonly title: string;
	readonly value: string;
	readonly active: boolean;
	readonly icon: typeof CalendarCheck2;
}): ReactElement {
	const { t } = useI18n();
	const Icon = props.icon;

	return (
		<article className={runtimeSignalCardClassName(props.active)}>
			<div className="cf:flex cf:items-start cf:justify-between cf:gap-3">
				<p className="campfire-runtime-signal-title">
					{props.title}
				</p>
				<Icon className="cf:size-6 cf:shrink-0 cf:text-amber-200" />
			</div>

			<p className="campfire-runtime-signal-value">
				{props.value}
			</p>
			<p className="campfire-runtime-signal-helper">
				{runtimeSignalStateLabel(props.active, t)}
			</p>
		</article>
	);
}