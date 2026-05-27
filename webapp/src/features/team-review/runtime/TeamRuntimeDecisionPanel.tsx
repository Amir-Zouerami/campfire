import type { ReactElement } from 'react';
import { CalendarCheck2, CalendarX2, Globe2, Umbrella, Users } from 'lucide-react';

import { CampfireStatusPill } from '@/app/campfire-ui';
import type { StandupRunDecision } from '@/types/domain';

import { runtimeReasonDescription, runtimeReasonLabel, runtimeSignalCardClassName } from './team-runtime.helpers';

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
	const decisionTone = props.decision.shouldRun ? 'green' : 'red';

	return (
		<section className="campfire-runtime-decision-flow">
			<article className="campfire-runtime-message-panel">
				<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-3">
					<div className="cf:min-w-0">
						<p className="cf:m-0 cf:text-sm cf:font-black cf:uppercase cf:leading-none cf:tracking-[0.18em] cf:text-amber-100">
							Runtime message
						</p>
						<h3 className="cf:m-0 cf:mt-3 cf:text-2xl cf:font-black cf:leading-tight cf:tracking-[-0.04em] cf:text-foreground">
							{props.decision.shouldRun ? 'Standup should run' : 'Standup should be skipped'}
						</h3>
					</div>

					<CampfireStatusPill tone={decisionTone}>
						{props.decision.shouldRun ? 'Run' : 'Skip'}
					</CampfireStatusPill>
				</div>

				<p className="cf:m-0 cf:mt-4 cf:text-sm cf:font-semibold cf:leading-7 cf:text-slate-300">
					{props.decision.message ||
						(props.decision.shouldRun ? 'Standup should run for this date.' : 'Standup should be skipped.')}
				</p>
			</article>

			<div className="campfire-runtime-signal-grid">
				<RuntimeSignalCard
					title="Working day"
					value={props.decision.isWorkingDay ? 'Yes' : 'No'}
					active={!props.decision.isWorkingDay}
					icon={props.decision.isWorkingDay ? CalendarCheck2 : CalendarX2}
				/>
				<RuntimeSignalCard
					title="Global off-days"
					value={String(props.decision.globalOffDays.length)}
					active={props.decision.globalOffDays.length > 0}
					icon={Globe2}
				/>
				<RuntimeSignalCard
					title="Workspace off-days"
					value={String(props.decision.workspaceOffDays.length)}
					active={props.decision.workspaceOffDays.length > 0}
					icon={CalendarX2}
				/>
				<RuntimeSignalCard
					title="Leave coverage"
					value={`${props.decision.onLeaveMemberCount}/${props.decision.memberCount}`}
					active={
						props.decision.memberCount > 0 &&
						props.decision.onLeaveMemberCount >= props.decision.memberCount
					}
					icon={Users}
				/>
			</div>

			<article className="campfire-runtime-reason-panel">
				<div className="campfire-icon-tile campfire-runtime-reason-icon">
					<Umbrella className="cf:size-6" />
				</div>

				<div className="cf:min-w-0">
					<p className="cf:m-0 cf:text-sm cf:font-black cf:uppercase cf:leading-none cf:tracking-[0.18em] cf:text-amber-100">
						Reason
					</p>

					<h3 className="cf:m-0 cf:mt-3 cf:text-2xl cf:font-black cf:leading-tight cf:tracking-[-0.04em] cf:text-foreground">
						{runtimeReasonLabel(props.decision.reason)}
					</h3>

					<p className="cf:m-0 cf:mt-3 cf:text-sm cf:font-semibold cf:leading-7 cf:text-slate-300">
						{runtimeReasonDescription(props.decision.reason)}
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
	const Icon = props.icon;

	return (
		<article className={runtimeSignalCardClassName(props.active)}>
			<div className="cf:flex cf:items-start cf:justify-between cf:gap-3">
				<p className="cf:m-0 cf:text-sm cf:font-black cf:uppercase cf:leading-none cf:tracking-[0.16em] cf:text-amber-100">
					{props.title}
				</p>
				<Icon className="cf:size-6 cf:shrink-0 cf:text-amber-200" />
			</div>

			<p className="cf:m-0 cf:mt-4 cf:text-3xl cf:font-black cf:tracking-tighter cf:text-foreground">
				{props.value}
			</p>
			<p className="cf:m-0 cf:mt-1 cf:text-xs cf:font-bold cf:text-muted-foreground">
				{props.active ? 'Affects decision' : 'Clear'}
			</p>
		</article>
	);
}
