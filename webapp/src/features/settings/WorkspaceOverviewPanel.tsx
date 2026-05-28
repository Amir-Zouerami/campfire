import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, BellRing, FileCog, Loader2, Save, Trash2, XCircle } from 'lucide-react';

import { ApiClientError, deleteWorkspace, updateWorkspaceNotificationSettings } from '@/api';
import { CampfireCardBody, CampfireCardHeader, CampfireMetric, CampfirePanel } from '@/app/campfire-ui';
import { useUserProfiles } from '@/app/useUserProfiles';
import { CampfireExternalLinkMetric } from '@/components/campfire/CampfireExternalLinkMetric';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

/**
 * WorkspaceOverviewPanel renders workspace identity, notification routing, and lifecycle controls.
 */
export function WorkspaceOverviewPanel(props: WorkspaceShellProps): ReactElement {
	const [confirmation, setConfirmation] = useState('');
	const [message, setMessage] = useState('');
	const [isDeleting, setIsDeleting] = useState(false);
	const [notificationMessage, setNotificationMessage] = useState('');
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
		setNotificationMessage('');

		try {
			await updateWorkspaceNotificationSettings(props.workspace.id, {
				approvedLeaveNotificationChannelId: draftNotificationChannelID,
			});

			toast.success('Workspace notification settings saved.');
			props.onWorkspaceSettingsChanged();
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error, 'Could not save workspace notification settings.');
			setNotificationMessage(errorMessage);
			toast.error(errorMessage);
		} finally {
			setIsSavingNotifications(false);
		}
	}

	/**
	 * handleUseWorkspaceChannel clears the fixed channel override.
	 */
	function handleUseWorkspaceChannel(): void {
		setNotificationChannelID('');
		setNotificationMessage('');
	}

	/**
	 * handleDeleteWorkspace archives the workspace setup for this channel.
	 */
	async function handleDeleteWorkspace(): Promise<void> {
		if (!canDelete || !confirmationMatches || isDeleting) {
			return;
		}

		setIsDeleting(true);
		setMessage('');

		try {
			const response = await deleteWorkspace(props.workspace.id);

			if (!response.deleted) {
				setMessage('Workspace setup was already disconnected.');
				toast.warning('Workspace setup was already disconnected.');
				props.onWorkspaceArchived();
				return;
			}

			toast.success('Campfire disconnected from this channel.');
			props.onWorkspaceArchived();
		} catch (error: unknown) {
			const errorMessage = errorToMessage(error, 'Could not disconnect Campfire from this channel.');
			setMessage(errorMessage);
			toast.error(errorMessage);
		} finally {
			setIsDeleting(false);
		}
	}

	return (
		<div className="cf:grid cf:gap-5">
			<CampfirePanel>
				<CampfireCardHeader
					eyebrow="Workspace"
					title={props.workspace.name}
					description="This overview stays intentionally lightweight. Detailed controls live in the focused settings pages."
					icon={FileCog}
				/>

				<CampfireCardBody className="campfire-context-grid">
					<CampfireMetric label="Channel ID" value={props.workspace.channelId} helper="Mattermost channel" />
					<CampfireMetric label="Team ID" value={props.workspace.teamId} helper="Mattermost team" />
					<CampfireMetric label="Timezone" value={props.workspace.timezone} helper="Schedule calculations" />
					<CampfireExternalLinkMetric
						label="Board URL"
						value={props.workspace.boardUrl}
						emptyValue="Not set"
						helper="Open external link"
					/>
					<CampfireMetric label="Created by" value={createdByLabel} helper="Workspace creator" />
					<CampfireMetric
						label="Status"
						value={props.workspace.isArchived ? 'Archived' : 'Active'}
						helper="Workspace state"
					/>
				</CampfireCardBody>
			</CampfirePanel>

			<CampfirePanel>
				<CampfireCardHeader
					eyebrow="Notifications"
					title="Approved leave announcements"
					description="Choose where team-facing approved leave updates are posted."
					icon={BellRing}
				/>

				<CampfireCardBody className="cf:grid cf:gap-4">
					<div className="campfire-context-grid">
						<CampfireMetric
							label="Current target"
							value={notificationTargetLabel}
							helper="Approved and cancelled approved leave"
						/>
						<CampfireMetric
							label="Fallback"
							value="Workspace channel"
							helper="Used when no fixed channel is set"
						/>
					</div>

					<div className="cf:grid cf:gap-2">
						<label
							htmlFor="campfire-approved-leave-notification-channel"
							className="cf:text-sm cf:font-black cf:text-foreground"
						>
							Fixed notification channel ID
						</label>
						<Input
							id="campfire-approved-leave-notification-channel"
							disabled={!canEditNotifications || isSavingNotifications}
							placeholder={`Empty = workspace channel (${props.workspace.channelId})`}
							value={notificationChannelID}
							onChange={event => {
								setNotificationChannelID(event.currentTarget.value);
								setNotificationMessage('');
							}}
						/>
						<p className="cf:m-0 cf:text-sm cf:font-semibold cf:leading-6 cf:text-muted-foreground">
							Leave this empty to post approved-leave announcements in the Campfire workspace channel.
							Paste a Mattermost channel or group conversation ID to route them to a fixed place.
						</p>
					</div>

					{notificationMessage !== '' && (
						<div className="cf:rounded-2xl cf:border cf:border-red-300/25 cf:bg-red-950/25 cf:px-4 cf:py-3 cf:text-sm cf:font-black cf:text-red-100">
							{notificationMessage}
						</div>
					)}

					<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3">
						<Button
							type="button"
							variant="secondary"
							disabled={
								!canEditNotifications || isSavingNotifications || draftNotificationChannelID === ''
							}
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
							{isSavingNotifications ? (
								<Loader2 className="cf:size-4 cf:animate-spin" />
							) : (
								<Save className="cf:size-4" />
							)}
							Save notifications
						</Button>
					</div>
				</CampfireCardBody>
			</CampfirePanel>

			<CampfirePanel>
				<CampfireCardHeader
					eyebrow="Danger zone"
					title="Disconnect Campfire from this channel"
					description="Archive this workspace setup so this Mattermost channel no longer has an active Campfire integration."
					icon={AlertTriangle}
				/>

				<CampfireCardBody className="cf:grid cf:gap-4">
					<div className="cf:rounded-2xl cf:border cf:border-red-300/25 cf:bg-red-950/25 cf:px-4 cf:py-3 cf:text-sm cf:font-black cf:leading-6 cf:text-red-100">
						This archives the workspace setup instead of hard-deleting historical data. Campfire will stop
						treating this channel as configured, active schedules will stop being discovered, and the
						channel can be set up again later.
					</div>

					{message !== '' && (
						<div className="cf:rounded-2xl cf:border cf:border-red-300/25 cf:bg-red-950/25 cf:px-4 cf:py-3 cf:text-sm cf:font-black cf:text-red-100">
							{message}
						</div>
					)}

					<div className="cf:grid cf:gap-2">
						<label
							htmlFor="campfire-delete-workspace-confirmation"
							className="cf:text-sm cf:font-black cf:text-foreground"
						>
							Type <span className="cf:text-amber-100">{expectedConfirmation}</span> to confirm.
						</label>
						<Input
							id="campfire-delete-workspace-confirmation"
							disabled={!canDelete || isDeleting}
							placeholder={expectedConfirmation}
							value={confirmation}
							onChange={event => setConfirmation(event.currentTarget.value)}
						/>
					</div>

					<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3">
						<p className="cf:m-0 cf:text-sm cf:font-semibold cf:leading-6 cf:text-muted-foreground">
							Only workspace Leads and system admins can disconnect Campfire from this channel.
						</p>

						<Button
							type="button"
							variant="destructive"
							disabled={!canDelete || !confirmationMatches || isDeleting}
							onClick={() => void handleDeleteWorkspace()}
						>
							{isDeleting ? (
								<Loader2 className="cf:size-4 cf:animate-spin" />
							) : (
								<Trash2 className="cf:size-4" />
							)}
							Disconnect Campfire
						</Button>
					</div>
				</CampfireCardBody>
			</CampfirePanel>
		</div>
	);
}

/**
 * errorToMessage converts unknown thrown values into a safe UI message.
 */
function errorToMessage(error: unknown, fallback: string): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return fallback;
}
