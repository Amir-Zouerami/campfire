import type { ReactElement } from 'react';
import { Loader2, Trash2, UsersRound } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { isAssignableWorkspaceRole } from './roles-access.helpers';
import type { AssignableWorkspaceRole, RoleGroup } from './roles-access.types';
import { CampfireEmpty, CampfireStatusPill } from '@/components/campfire/CampfireLayoutPrimitives';

/**
 * RoleGroupsPanelProps contains role groups and user labels.
 */
type RoleGroupsPanelProps = {
	readonly groups: readonly RoleGroup[];
	readonly canManageRoles: boolean;
	readonly savingKey: string;
	readonly labelForUserID: (userID: string) => string;
	readonly onRemoveRole: (role: AssignableWorkspaceRole, userID: string) => Promise<void>;
};

/**
 * RoleGroupsPanel renders effective role groups.
 */
export function RoleGroupsPanel(props: RoleGroupsPanelProps): ReactElement {
	return (
		<section className="campfire-role-group-list">
			{props.groups.map(group => (
				<RoleGroupCard
					key={group.id}
					group={group}
					canManageRoles={props.canManageRoles}
					savingKey={props.savingKey}
					labelForUserID={props.labelForUserID}
					onRemoveRole={props.onRemoveRole}
				/>
			))}
		</section>
	);
}

/**
 * RoleGroupCard renders one role group.
 */
function RoleGroupCard(props: {
	readonly group: RoleGroup;
	readonly canManageRoles: boolean;
	readonly savingKey: string;
	readonly labelForUserID: (userID: string) => string;
	readonly onRemoveRole: (role: AssignableWorkspaceRole, userID: string) => Promise<void>;
}): ReactElement {
	const removableRole =
		props.canManageRoles && props.group.removable && isAssignableWorkspaceRole(props.group.role)
			? props.group.role
			: null;

	return (
		<article className="campfire-role-group-card">
			<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-3">
				<div>
					<p className="cf:text-sm cf:font-semibold cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
						{props.group.title}
					</p>
					<h3 className="cf:mt-1 cf:text-xl cf:font-semibold cf:tracking-[-0.03em] cf:text-foreground">
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
					description="Named assignments will appear here after they are added."
				/>
			) : (
				<div className="cf:flex cf:flex-wrap cf:gap-2">
					{props.group.userIDs.map(userID => {
						const saving = props.savingKey === `${props.group.role}:${userID}`;

						return (
							<span
								key={`${props.group.id}-${userID}`}
								className="cf:inline-flex cf:max-w-full cf:items-center cf:gap-2 cf:rounded-full cf:border cf:border-emerald-300/20 cf:bg-emerald-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-semibold cf:text-emerald-100"
								title={userID}
							>
								<span className="cf:truncate">{props.labelForUserID(userID)}</span>

								{removableRole !== null && (
									<Button
										type="button"
										variant="ghost"
										size="icon-xs"
										className="cf:-mr-1 cf:size-8 cf:rounded-full cf:text-emerald-100 hover:cf:bg-red-400/15 hover:cf:text-red-100"
										disabled={saving}
										aria-label={`Remove ${props.labelForUserID(userID)} from ${props.group.title}`}
										onClick={() => void props.onRemoveRole(removableRole, userID)}
									>
										{saving ? (
											<Loader2 className="cf:size-4 cf:animate-spin" />
										) : (
											<Trash2 className="cf:size-4" />
										)}
									</Button>
								)}
							</span>
						);
					})}
				</div>
			)}
		</article>
	);
}
