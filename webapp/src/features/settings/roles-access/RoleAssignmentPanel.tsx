import type { ReactElement } from 'react';
import { Loader2, UserPlus } from 'lucide-react';

import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { CampfireUserPicker } from '@/components/campfire/CampfireUserPicker';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

import { ASSIGNABLE_WORKSPACE_ROLES, roleLabel, toAssignableWorkspaceRole } from './roles-access.helpers';
import type { RoleAssignmentDraft } from './roles-access.types';
import { CampfireStatusPill } from '@/components/campfire/CampfireLayoutPrimitives';

/**
 * RoleAssignmentPanelProps contains the role assignment form state.
 */
type RoleAssignmentPanelProps = {
	readonly workspaceID: string;
	readonly draft: RoleAssignmentDraft;
	readonly disabled: boolean;
	readonly canManageRoles: boolean;
	readonly saving: boolean;
	readonly onDraftChange: (patch: Partial<RoleAssignmentDraft>) => void;
	readonly onAssign: () => Promise<void>;
};

/**
 * RoleAssignmentPanel renders minimal real role assignment controls.
 */
export function RoleAssignmentPanel(props: RoleAssignmentPanelProps): ReactElement {
	const formDisabled = props.disabled || !props.canManageRoles;

	return (
		<section className="campfire-role-assignment-panel cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5">
			<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-3">
				<div>
					<p className="cf:flex cf:items-center cf:gap-2 cf:text-sm cf:font-semibold cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
						<UserPlus className="cf:size-5" />
						Assign role
					</p>
					<h3 className="cf:mt-1 cf:text-xl cf:font-semibold cf:tracking-[-0.03em] cf:text-foreground">
						Add named access
					</h3>
					<p className="cf:mt-2 cf:text-sm cf:font-semibold cf:leading-6 cf:text-muted-foreground">
						Search a channel member by username, display name, or email, then choose the exact Campfire role.
					</p>
				</div>

				<CampfireStatusPill tone={props.canManageRoles ? 'green' : 'slate'}>
					{props.canManageRoles ? 'Editable' : 'Read only'}
				</CampfireStatusPill>
			</div>

			<form
				className="cf:grid cf:gap-4 cf:xl:grid-cols-[1fr_14rem_auto]"
				onSubmit={event => {
					event.preventDefault();
					void props.onAssign();
				}}
			>
				<div className="cf:grid cf:gap-2">
					<Label>User</Label>
					<CampfireUserPicker
						workspaceID={props.workspaceID}
						disabled={formDisabled}
						value={props.draft.userID}
						onChange={userID => props.onDraftChange({ userID })}
					/>
				</div>

				<div className="cf:grid cf:gap-2">
					<Label htmlFor="campfire-role-select">Role</Label>
					<CampfireSelect
						id="campfire-role-select"
						disabled={formDisabled}
						value={props.draft.role}
						onValueChange={value => props.onDraftChange({ role: toAssignableWorkspaceRole(value) })}
					>
						{ASSIGNABLE_WORKSPACE_ROLES.map(role => (
							<option key={role} value={role}>
								{roleLabel(role)}
							</option>
						))}
					</CampfireSelect>
				</div>

				<div className="cf:flex cf:items-end">
					<Button type="submit" disabled={formDisabled}>
						{props.saving ? (
							<Loader2 className="cf:size-4 cf:animate-spin" />
						) : (
							<UserPlus className="cf:size-4" />
						)}
						Add role
					</Button>
				</div>
			</form>
		</section>
	);
}
