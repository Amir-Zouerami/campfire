import type { ReactElement } from 'react';
import { UsersRound } from 'lucide-react';

import { CampfireEmpty, CampfireStatusPill } from '@/app/campfire-ui';

import type { RoleGroup } from './roles-access.types';

/**
 * RoleGroupsPanelProps contains role groups and user labels.
 */
type RoleGroupsPanelProps = {
	readonly groups: readonly RoleGroup[];
	readonly labelForUserID: (userID: string) => string;
};

/**
 * RoleGroupsPanel renders effective role groups.
 */
export function RoleGroupsPanel(props: RoleGroupsPanelProps): ReactElement {
	return (
		<section className="cf:grid cf:gap-4">
			{props.groups.map(group => (
				<RoleGroupCard key={group.id} group={group} labelForUserID={props.labelForUserID} />
			))}
		</section>
	);
}

/**
 * RoleGroupCard renders one role group.
 */
function RoleGroupCard(props: {
	readonly group: RoleGroup;
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	return (
		<article className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5">
			<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-3">
				<div>
					<p className="cf:text-sm cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
						{props.group.title}
					</p>
					<h3 className="cf:mt-1 cf:text-xl cf:font-black cf:tracking-[-0.03em] cf:text-foreground">
						{props.group.userIDs.length} {props.group.userIDs.length === 1 ? 'user' : 'users'}
					</h3>
					<p className="cf:mt-2 cf:text-sm cf:font-semibold cf:leading-6 cf:text-muted-foreground">
						{props.group.description}
					</p>
				</div>

				<CampfireStatusPill tone={props.group.tone}>{props.group.title}</CampfireStatusPill>
			</div>

			{props.group.userIDs.length === 0 ? (
				<CampfireEmpty
					icon={UsersRound}
					title={`No ${props.group.title.toLowerCase()} yet`}
					description="Named assignments will appear here when backend role assignment APIs are added."
				/>
			) : (
				<div className="cf:flex cf:flex-wrap cf:gap-2">
					{props.group.userIDs.map(userID => (
						<span
							key={`${props.group.id}-${userID}`}
							className="cf:max-w-full cf:truncate cf:rounded-full cf:border cf:border-emerald-300/20 cf:bg-emerald-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-black cf:text-emerald-100"
							title={userID}
						>
							{props.labelForUserID(userID)}
						</span>
					))}
				</div>
			)}
		</article>
	);
}
