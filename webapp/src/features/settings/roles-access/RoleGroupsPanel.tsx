import type { ReactElement } from 'react';
import { Loader2, Trash2, UsersRound } from 'lucide-react';

import { CampfireBidiText } from '@/components/campfire/CampfireBidiText';
import { CampfireEmpty, CampfireStatusPill } from '@/components/campfire/CampfireLayoutPrimitives';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';

import { isAssignableWorkspaceRole } from './roles-access.helpers';
import {
	formatRoleGroupUserCount,
	localizedRoleGroupDescription,
	localizedRoleGroupTitle,
	roleGroupEmptyTitle,
} from './roles-access.i18n';
import type { AssignableWorkspaceRole, RoleGroup } from './roles-access.types';

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
	const { t } = useI18n();
	const groupTitle = localizedRoleGroupTitle(t, props.group.id);
	const removableRole =
		props.canManageRoles && props.group.removable && isAssignableWorkspaceRole(props.group.role)
			? props.group.role
			: null;

	return (
		<article className="campfire-role-group-card">
			<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-3">
				<div>
					<p className="cf:text-sm cf:font-semibold cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
						{groupTitle}
					</p>
					<h3 className="cf:mt-1 cf:text-xl cf:font-semibold cf:tracking-[-0.03em] cf:text-foreground">
						{formatRoleGroupUserCount(t, props.group.userIDs.length)}
					</h3>
					<p className="cf:mt-2 cf:text-sm cf:font-semibold cf:leading-6 cf:text-muted-foreground">
						{localizedRoleGroupDescription(t, props.group.id)}
					</p>
				</div>

				<CampfireStatusPill tone={props.group.tone}>{groupTitle}</CampfireStatusPill>
			</div>

			{props.group.userIDs.length === 0 ? (
				<CampfireEmpty
					icon={UsersRound}
					title={roleGroupEmptyTitle(t, props.group)}
					description={t('settings.roles.group.empty.description')}
				/>
			) : (
				<div className="cf:flex cf:flex-wrap cf:gap-2">
					{props.group.userIDs.map(userID => {
						const userLabel = props.labelForUserID(userID);
						const saving = props.savingKey === `${props.group.role}:${userID}`;

						return (
							<span
								key={`${props.group.id}-${userID}`}
								className="cf:inline-flex cf:max-w-full cf:items-center cf:gap-2 cf:rounded-full cf:border cf:border-emerald-300/20 cf:bg-emerald-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-semibold cf:text-emerald-100"
								title={userID}
							>
								<CampfireBidiText className="cf:truncate">{userLabel}</CampfireBidiText>

								{removableRole !== null && (
									<Button
										type="button"
										variant="ghost"
										size="icon-xs"
										className="cf:-mr-1 cf:size-8 cf:rounded-full cf:text-emerald-100 hover:cf:bg-red-400/15 hover:cf:text-red-100"
										disabled={saving}
										aria-label={t('settings.roles.group.remove.ariaLabel', {
											user: userLabel,
											group: groupTitle,
										})}
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
