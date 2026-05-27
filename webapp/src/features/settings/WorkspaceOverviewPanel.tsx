import { useState } from 'react';
import type { ReactElement } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, FileCog, Loader2, Trash2 } from 'lucide-react';

import { ApiClientError, deleteWorkspace } from '@/api';
import { CampfireCardBody, CampfireCardHeader, CampfireMetric, CampfirePanel } from '@/app/campfire-ui';
import { useUserProfiles } from '@/app/useUserProfiles';
import { CampfireExternalLinkMetric } from '@/components/campfire/CampfireExternalLinkMetric';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

/**
 * WorkspaceOverviewPanel renders static workspace identity and lifecycle controls.
 */
export function WorkspaceOverviewPanel(props: WorkspaceShellProps): ReactElement {
	const [confirmation, setConfirmation] = useState('');
	const [message, setMessage] = useState('');
	const [isDeleting, setIsDeleting] = useState(false);

	const creatorProfiles = useUserProfiles([props.workspace.createdBy]);

	const expectedConfirmation = props.workspace.name;
	const canDelete = props.canManageWorkspace || props.isSystemAdmin;
	const confirmationMatches = confirmation.trim() === expectedConfirmation;
	const createdByLabel =
		props.workspace.createdBy.trim() === '' ? 'Unknown' : creatorProfiles.labelForUserID(props.workspace.createdBy);

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
			const errorMessage = errorToMessage(error);
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
function errorToMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return 'Could not disconnect Campfire from this channel.';
}
