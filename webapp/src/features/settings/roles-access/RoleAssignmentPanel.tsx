import type { ReactElement } from 'react';
import { Loader2, UserPlus } from 'lucide-react';

import { CampfireControlButton } from '@/components/campfire/CampfireControlButton';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { CampfireUserPicker } from '@/components/campfire/CampfireUserPicker';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/i18n';

import { ASSIGNABLE_WORKSPACE_ROLES, toAssignableWorkspaceRole } from './roles-access.helpers';
import { localizedRoleLabel } from './roles-access.i18n';
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
 * RoleAssignmentPanel renders role assignment through fixed-height controls.
 */
export function RoleAssignmentPanel(props: RoleAssignmentPanelProps): ReactElement {
	const { t } = useI18n();
	const formDisabled = props.disabled || !props.canManageRoles;

	return (
		<section className="campfire-role-assignment-panel cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5">
			<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-3">
				<div>
					<p className="cf:flex cf:items-center cf:gap-2 cf:text-sm cf:font-semibold cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
						<UserPlus className="cf:size-5" />
						{t('settings.roles.assignment.eyebrow')}
					</p>
					<h3 className="cf:mt-1 cf:text-xl cf:font-semibold cf:tracking-[-0.03em] cf:text-foreground">
						{t('settings.roles.assignment.title')}
					</h3>
					<p className="cf:mt-2 cf:text-sm cf:font-semibold cf:leading-6 cf:text-muted-foreground">
						{t('settings.roles.assignment.description')}
					</p>
				</div>

				<CampfireStatusPill tone={props.canManageRoles ? 'green' : 'slate'}>
					{props.canManageRoles ? t('settings.roles.status.editable') : t('settings.roles.status.readOnly')}
				</CampfireStatusPill>
			</div>

			<form
				className="campfire-role-assignment-form"
				onSubmit={event => {
					event.preventDefault();
					void props.onAssign();
				}}
			>
				<div className="campfire-role-assignment-field">
					<Label>{t('settings.roles.assignment.user.label')}</Label>
					<CampfireUserPicker
						workspaceID={props.workspaceID}
						disabled={formDisabled}
						value={props.draft.userID}
						onChange={userID => props.onDraftChange({ userID })}
					/>
				</div>

				<div className="campfire-role-assignment-field">
					<Label htmlFor="campfire-role-select">{t('settings.roles.assignment.access.label')}</Label>
					<CampfireSelect
						id="campfire-role-select"
						disabled={formDisabled}
						value={props.draft.role}
						onValueChange={value => props.onDraftChange({ role: toAssignableWorkspaceRole(value) })}
					>
						{ASSIGNABLE_WORKSPACE_ROLES.map(role => (
							<option key={role} value={role}>
								{localizedRoleLabel(t, role)}
							</option>
						))}
					</CampfireSelect>
				</div>

				<div className="campfire-role-assignment-action">
					<CampfireControlButton type="submit" disabled={formDisabled}>
						{props.saving ? (
							<Loader2 className="cf:size-4 cf:animate-spin" />
						) : (
							<UserPlus className="cf:size-4" />
						)}
						{t('settings.roles.assignment.submit')}
					</CampfireControlButton>
				</div>
			</form>
		</section>
	);
}
