import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import {
	AlertTriangle,
	BellRing,
	Building2,
	ExternalLink,
	Hash,
	Loader2,
	Save,
	ShieldCheck,
	Trash2,
	UserRound,
	XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { deleteWorkspace, updateWorkspaceNotificationSettings } from '@/api';
import { useUserProfiles } from '@/app/useUserProfiles';
import { CampfireSurface, CampfireWorkflowNote } from '@/components/campfire/CampfireLayoutPrimitives';
import { cn } from '@/lib/utils';
import { toast } from '@/components/campfire/campfire-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

/**
 * WorkspaceOverviewPanel renders workspace identity, notification routing, and
 * lifecycle controls as focused settings surfaces instead of nested cards.
 */
export function WorkspaceOverviewPanel(props: WorkspaceShellProps): ReactElement {
	const [confirmation, setConfirmation] = useState('');
	const [isDeleting, setIsDeleting] = useState(false);
	const [notificationChannelID, setNotificationChannelID] = useState(
		props.workspace.approvedLeaveNotificationChannelId,
	);
	const [isSavingNotifications, setIsSavingNotifications] = useState(false);

	const creatorProfiles = useUserProfiles([props.workspace.createdBy]);

	const expectedConfirmation = props.workspace.name;
	const canDelete = props.canManageWorkspace || props.isSystemAdmin;
	const canEditNotifications = props.canManageWorkspace || props.isSystemAdmin;
	const confirmationMatches = confirmation.trim() === expectedConfirmation;
	const createdByLabel =
		props.workspace.createdBy.trim() === '' ? 'Unknown' : creatorProfiles.labelForUserID(props.workspace.createdBy);
	const savedNotificationChannelID = props.workspace.approvedLeaveNotificationChannelId.trim();
	const draftNotificationChannelID = notificationChannelID.trim();
	const notificationDirty = draftNotificationChannelID !== savedNotificationChannelID;
	const notificationTargetLabel =
		savedNotificationChannelID === '' ? 'Workspace channel' : `Fixed channel ${savedNotificationChannelID}`;

	useEffect(() => {
		setNotificationChannelID(props.workspace.approvedLeaveNotificationChannelId);
	}, [props.workspace.approvedLeaveNotificationChannelId]);

	/**
	 * handleSaveNotificationSettings saves approved-leave announcement routing.
	 */
	async function handleSaveNotificationSettings(): Promise<void> {
		if (!canEditNotifications || isSavingNotifications || !notificationDirty) {
			return;
		}

		setIsSavingNotifications(true);

		try {
			await updateWorkspaceNotificationSettings(props.workspace.id, {
				approvedLeaveNotificationChannelId: draftNotificationChannelID,
			});

			toast.success('Workspace notification settings saved.');
			props.onWorkspaceSettingsChanged();
		} catch (error: unknown) {
			toast.error(error, {
				fallbackMessage: 'Could not save workspace notification settings.',
			});
		} finally {
			setIsSavingNotifications(false);
		}
	}

	/**
	 * handleUseWorkspaceChannel clears the fixed channel override.
	 */
	function handleUseWorkspaceChannel(): void {
		setNotificationChannelID('');
	}

	/**
	 * handleDeleteWorkspace archives the workspace setup for this channel.
	 */
	async function handleDeleteWorkspace(): Promise<void> {
		if (!canDelete || !confirmationMatches || isDeleting) {
			return;
		}

		setIsDeleting(true);

		try {
			const response = await deleteWorkspace(props.workspace.id);

			if (!response.deleted) {
				toast.warning('Workspace setup was already disconnected.');
				props.onWorkspaceArchived();
				return;
			}

			toast.success('Campfire disconnected from this channel.');
			props.onWorkspaceArchived();
		} catch (error: unknown) {
			toast.error(error, {
				fallbackMessage: 'Could not disconnect Campfire from this channel.',
			});
		} finally {
			setIsDeleting(false);
		}
	}

	return (
		<div className="campfire-workspace-overview">
			<CampfireSurface className="campfire-workspace-overview-identity">
				<div className="campfire-workspace-overview-heading">
					<div>
						<p className="campfire-page-eyebrow">Workspace</p>
						<h3>{props.workspace.name}</h3>
						<p>
							A lightweight overview of the Mattermost channel connected to Campfire. Detailed
							configuration stays in the focused settings pages.
						</p>
					</div>
					<span className="campfire-overview-status-pill">
						{props.workspace.isArchived ? 'Archived' : 'Active'}
					</span>
				</div>

				<div className="campfire-workspace-facts">
					<OverviewFact icon={Hash} label="Channel" value={props.workspace.channelId} helper="Mattermost channel ID" />
					<OverviewFact icon={Building2} label="Team" value={props.workspace.teamId} helper="Mattermost team ID" />
					<OverviewFact icon={ShieldCheck} label="Timezone" value={props.workspace.timezone} helper="Schedules and reports" />
					<OverviewFact icon={UserRound} label="Created by" value={createdByLabel} helper="Workspace creator" />
				</div>

				<div className="campfire-workspace-facts">
					<OverviewFact
						icon={ExternalLink}
						label="Board URL"
						value={props.workspace.boardUrl.trim() === '' ? 'Not set' : props.workspace.boardUrl}
						helper={props.workspace.boardUrl.trim() === '' ? 'External board link' : 'Open external board'}
						href={props.workspace.boardUrl.trim() === '' ? undefined : props.workspace.boardUrl}
						className="campfire-overview-board-fact"
					/>
				</div>
			</CampfireSurface>

			<CampfireSurface className="campfire-workspace-settings-surface">
				<div className="campfire-workspace-settings-header">
					<div>
						<p className="campfire-page-eyebrow">Notifications</p>
						<h3>Approved leave announcements</h3>
						<p>Choose where team-facing approved leave updates are posted.</p>
					</div>
					<BellRing className="cf:size-5" aria-hidden="true" />
				</div>

				<div className="campfire-workspace-route-summary">
					<OverviewFact icon={BellRing} label="Current target" value={notificationTargetLabel} helper="Approved and cancelled approved leave" />
					<OverviewFact icon={Hash} label="Fallback" value="Workspace channel" helper="Used when no fixed channel is set" />
				</div>

				<div className="campfire-field-stack">
					<label htmlFor="campfire-approved-leave-notification-channel" className="campfire-field-label">
						Fixed notification channel ID
					</label>
					<Input
						id="campfire-approved-leave-notification-channel"
						disabled={!canEditNotifications || isSavingNotifications}
						placeholder={`Empty = workspace channel (${props.workspace.channelId})`}
						value={notificationChannelID}
						onChange={event => setNotificationChannelID(event.currentTarget.value)}
					/>
					<p>
						Leave this empty to post announcements in the Campfire workspace channel. Paste a
						Mattermost channel or group conversation ID to route them to a fixed place.
					</p>
				</div>

				<div className="campfire-workspace-actions-row">
					<Button
						type="button"
						variant="secondary"
						disabled={!canEditNotifications || isSavingNotifications || draftNotificationChannelID === ''}
						onClick={handleUseWorkspaceChannel}
					>
						<XCircle className="cf:size-4" />
						Use workspace channel
					</Button>

					<Button
						type="button"
						disabled={!canEditNotifications || isSavingNotifications || !notificationDirty}
						onClick={() => void handleSaveNotificationSettings()}
					>
						{isSavingNotifications ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Save className="cf:size-4" />}
						Save notifications
					</Button>
				</div>
			</CampfireSurface>

			<CampfireSurface className="campfire-workspace-danger-surface">
				<div className="campfire-workspace-settings-header">
					<div>
						<p className="campfire-page-eyebrow">Danger zone</p>
						<h3>Disconnect Campfire from this channel</h3>
						<p>Archive this workspace setup without hard-deleting historical Campfire data.</p>
					</div>
					<AlertTriangle className="cf:size-5" aria-hidden="true" />
				</div>

				<CampfireWorkflowNote
					icon={AlertTriangle}
					title="Workspace data is preserved."
					description="Campfire will stop treating this channel as configured, active schedules will stop being discovered, and the channel can be set up again later."
				/>

				<div className="campfire-field-stack">
					<label htmlFor="campfire-delete-workspace-confirmation" className="campfire-field-label">
						Type <span>{expectedConfirmation}</span> to confirm.
					</label>
					<Input
						id="campfire-delete-workspace-confirmation"
						disabled={!canDelete || isDeleting}
						placeholder={expectedConfirmation}
						value={confirmation}
						onChange={event => setConfirmation(event.currentTarget.value)}
					/>
				</div>

				<div className="campfire-workspace-actions-row">
					<p>Only workspace Leads and system admins can disconnect Campfire from this channel.</p>

					<Button
						type="button"
						variant="destructive"
						disabled={!canDelete || !confirmationMatches || isDeleting}
						onClick={() => void handleDeleteWorkspace()}
					>
						{isDeleting ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Trash2 className="cf:size-4" />}
						Disconnect Campfire
					</Button>
				</div>
			</CampfireSurface>
		</div>
	);
}

/**
 * OverviewFact renders one compact workspace metadata row.
 */
function OverviewFact(props: {
	readonly icon: LucideIcon;
	readonly label: string;
	readonly value: string;
	readonly helper: string;
	readonly href?: string;
	readonly className?: string;
}): ReactElement {
	const Icon = props.icon;

	const valueNode = props.href === undefined ? (
		<strong title={props.value}>{props.value}</strong>
	) : (
		<a href={props.href} target="_blank" rel="noreferrer" title={props.value}>
			{props.value}
		</a>
	);

	return (
		<div className={cn('campfire-overview-fact', props.className)}>
			<span className="campfire-overview-fact-icon" aria-hidden="true">
				<Icon className="cf:size-4" />
			</span>
			<span className="campfire-overview-fact-copy">
				<span>{props.label}</span>
				{valueNode}
				<small>{props.helper}</small>
			</span>
		</div>
	);
}
