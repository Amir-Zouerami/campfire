import type { ReactElement } from 'react';
import { Loader2, UserPlus } from 'lucide-react';

import { CampfireStatusPill } from '@/app/campfire-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
	ASSIGNABLE_WORKSPACE_ROLES,
	nativeRoleSelectClassName,
	roleLabel,
	toAssignableWorkspaceRole,
} from './roles-access.helpers';
import type { RoleAssignmentDraft } from './roles-access.types';

/**
 * RoleAssignmentPanelProps contains the role assignment form state.
 */
type RoleAssignmentPanelProps = {
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
		<section className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5">
			<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-3">
				<div>
					<p className="cf:flex cf:items-center cf:gap-2 cf:text-sm cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
						<UserPlus className="cf:size-4" />
						Assign role
					</p>
					<h3 className="cf:mt-1 cf:text-xl cf:font-black cf:tracking-[-0.03em] cf:text-foreground">
						Add named access
					</h3>
					<p className="cf:mt-2 cf:text-sm cf:font-semibold cf:leading-6 cf:text-muted-foreground">
						Enter a Mattermost user ID and choose the exact Campfire role. Members still come from channel
						membership automatically.
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
					<Label htmlFor="campfire-role-user-id">Mattermost user ID</Label>
					<Input
						id="campfire-role-user-id"
						disabled={formDisabled}
						placeholder="Paste user ID"
						value={props.draft.userID}
						onChange={event => props.onDraftChange({ userID: event.currentTarget.value })}
					/>
				</div>

				<div className="cf:grid cf:gap-2">
					<Label htmlFor="campfire-role-select">Role</Label>
					<select
						id="campfire-role-select"
						className={nativeRoleSelectClassName()}
						disabled={formDisabled}
						value={props.draft.role}
						onChange={event =>
							props.onDraftChange({ role: toAssignableWorkspaceRole(event.currentTarget.value) })
						}
					>
						{ASSIGNABLE_WORKSPACE_ROLES.map(role => (
							<option key={role} value={role}>
								{roleLabel(role)}
							</option>
						))}
					</select>
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
