import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import {
	AlertTriangle,
	BellRing,
	Building2,
	Clock3,
	ExternalLink,
	Hash,
	Languages,
	Loader2,
	Save,
	ShieldCheck,
	Trash2,
	UserRound,
	XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { deleteWorkspace, updateWorkspaceNotificationSettings, updateWorkspaceTimezone } from '@/api';
import { useUserProfiles } from '@/app/useUserProfiles';
import { CampfireLanguageSelect } from '@/components/campfire/CampfireLanguageSelect';
import { CampfireTimezoneSelect } from '@/components/campfire/CampfireTimezoneSelect';
import { CampfireUserMultiPicker } from '@/components/campfire/CampfireUserMultiPicker';
import { CampfireSurface, CampfireWorkflowNote } from '@/components/campfire/CampfireLayoutPrimitives';
import { cn } from '@/lib/utils';
import { toast } from '@/components/campfire/campfire-toast';
import { CampfireResponsiveInput } from '@/components/campfire/CampfireResponsiveInput';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/button';
import type { WorkspaceShellProps } from '@/features/workspace-shell/workspace-shell.types';

/**
 * WorkspaceOverviewPanel renders workspace identity, notification routing, and
 * lifecycle controls as focused settings surfaces instead of nested cards.
 */
export function WorkspaceOverviewPanel(props: WorkspaceShellProps): ReactElement {
	const { t } = useI18n();
	const [confirmation, setConfirmation] = useState('');
	const [isDeleting, setIsDeleting] = useState(false);
	const [notificationChannelID, setNotificationChannelID] = useState(
		props.workspace.approvedLeaveNotificationChannelId,
	);
	const [generatedMessageLanguage, setGeneratedMessageLanguage] = useState(
		props.workspace.generatedMessageLanguage,
	);
	const [leaveRequestRecipientIDs, setLeaveRequestRecipientIDs] = useState<readonly string[]>(
		props.workspace.leaveRequestNotificationRecipientIds,
	);
	const [timezone, setTimezone] = useState(props.workspace.timezone);
	const [isSavingNotifications, setIsSavingNotifications] = useState(false);
	const [isSavingTimezone, setIsSavingTimezone] = useState(false);
	const [isSavingLanguage, setIsSavingLanguage] = useState(false);

	const creatorProfiles = useUserProfiles([props.workspace.createdBy]);

	const expectedConfirmation = props.workspace.name;
	const canDelete = props.canManageWorkspace || props.isSystemAdmin;
	const canEditWorkspaceSettings = props.canManageWorkspace || props.isSystemAdmin;
	const confirmationMatches = confirmation.trim() === expectedConfirmation;
	const createdByLabel =
		props.workspace.createdBy.trim() === '' ? t('common.unknown') : creatorProfiles.labelForUserID(props.workspace.createdBy);
	const savedNotificationChannelID = props.workspace.approvedLeaveNotificationChannelId.trim();
	const draftNotificationChannelID = notificationChannelID.trim();
	const savedLeaveRequestRecipientKey = props.workspace.leaveRequestNotificationRecipientIds.join('|');
	const draftLeaveRequestRecipientKey = leaveRequestRecipientIDs.join('|');
	const notificationDirty = draftNotificationChannelID !== savedNotificationChannelID
		|| draftLeaveRequestRecipientKey !== savedLeaveRequestRecipientKey;
	const notificationTargetLabel =
		savedNotificationChannelID === ''
			? t('settings.overview.notifications.workspaceChannel')
			: t('settings.overview.notifications.fixedChannel', { channelId: savedNotificationChannelID });
	const timezoneDirty = timezone.trim() !== props.workspace.timezone.trim();
	const languageDirty = generatedMessageLanguage !== props.workspace.generatedMessageLanguage;

	useEffect(() => {
		setNotificationChannelID(props.workspace.approvedLeaveNotificationChannelId);
		setGeneratedMessageLanguage(props.workspace.generatedMessageLanguage);
		setLeaveRequestRecipientIDs(props.workspace.leaveRequestNotificationRecipientIds);
		setTimezone(props.workspace.timezone);
	}, [
		props.workspace.approvedLeaveNotificationChannelId,
		props.workspace.generatedMessageLanguage,
		props.workspace.timezone,
		savedLeaveRequestRecipientKey,
	]);

	/**
	 * handleSaveNotificationSettings saves approved-leave announcement routing.
	 */
	async function handleSaveNotificationSettings(): Promise<void> {
		if (!canEditWorkspaceSettings || isSavingNotifications || !notificationDirty) {
			return;
		}

		setIsSavingNotifications(true);

		try {
			await updateWorkspaceNotificationSettings(props.workspace.id, {
				approvedLeaveNotificationChannelId: draftNotificationChannelID,
				leaveRequestNotificationRecipientIds: leaveRequestRecipientIDs,
				leaveNotificationLanguage: generatedMessageLanguage,
				generatedMessageLanguage,
			});

			toast.success(t('settings.notifications.language.saved'));
			props.onWorkspaceSettingsChanged();
		} catch (error: unknown) {
			toast.error(error, {
				fallbackMessage: t('settings.notifications.language.error'),
			});
		} finally {
			setIsSavingNotifications(false);
		}
	}

	/**
	 * handleSaveLanguage persists the workspace UI/generated-message language without changing timezone.
	 */
	async function handleSaveLanguage(): Promise<void> {
		if (!canEditWorkspaceSettings || isSavingLanguage || !languageDirty) {
			return;
		}

		setIsSavingLanguage(true);

		try {
			await updateWorkspaceNotificationSettings(props.workspace.id, {
				approvedLeaveNotificationChannelId: savedNotificationChannelID,
				leaveRequestNotificationRecipientIds: props.workspace.leaveRequestNotificationRecipientIds,
				leaveNotificationLanguage: generatedMessageLanguage,
				generatedMessageLanguage,
			});

			toast.success(t('settings.overview.language.toast.saved'));
			props.onWorkspaceSettingsChanged();
		} catch (error: unknown) {
			toast.error(error, {
				fallbackMessage: t('settings.overview.language.toast.error'),
			});
		} finally {
			setIsSavingLanguage(false);
		}
	}

	/**
	 * handleSaveTimezone persists the workspace timezone used by schedules and reports.
	 */
	async function handleSaveTimezone(): Promise<void> {
		if (!canEditWorkspaceSettings || isSavingTimezone || !timezoneDirty) {
			return;
		}

		setIsSavingTimezone(true);

		try {
			await updateWorkspaceTimezone(props.workspace.id, {
				timezone: timezone.trim(),
			});

			toast.success(t('settings.overview.timezone.toast.saved'));
			props.onWorkspaceSettingsChanged();
		} catch (error: unknown) {
			toast.error(error, {
				fallbackMessage: t('settings.overview.timezone.toast.error'),
			});
		} finally {
			setIsSavingTimezone(false);
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
				toast.warning(t('settings.overview.toast.alreadyDisconnected'));
				props.onWorkspaceArchived();
				return;
			}

			toast.success(t('settings.overview.toast.disconnected'));
			props.onWorkspaceArchived();
		} catch (error: unknown) {
			toast.error(error, {
				fallbackMessage: t('settings.overview.toast.disconnectError'),
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
						<p className="campfire-page-eyebrow">{t('settings.overview.identity.eyebrow')}</p>
						<h3>{props.workspace.name}</h3>
						<p>{t('settings.overview.identity.description')}</p>
					</div>
					<span className="campfire-overview-status-pill">
						{props.workspace.isArchived ? t('common.archived') : t('common.active')}
					</span>
				</div>

				<div className="campfire-workspace-facts">
					<OverviewFact icon={Hash} label={t('settings.overview.fact.channel')} value={props.workspace.channelId} helper={t('settings.overview.fact.channel.helper')} />
					<OverviewFact icon={Building2} label={t('settings.overview.fact.team')} value={props.workspace.teamId} helper={t('settings.overview.fact.team.helper')} />
					<OverviewFact icon={ShieldCheck} label={t('settings.overview.fact.timezone')} value={props.workspace.timezone} helper={t('settings.overview.fact.timezone.helper')} />
					<OverviewFact icon={UserRound} label={t('settings.overview.fact.createdBy')} value={createdByLabel} helper={t('settings.overview.fact.createdBy.helper')} />
				</div>

				<div className="campfire-workspace-facts">
					<OverviewFact
						icon={ExternalLink}
						label={t('settings.overview.fact.boardUrl')}
						value={props.workspace.boardUrl.trim() === '' ? t('common.notSet') : props.workspace.boardUrl}
						helper={props.workspace.boardUrl.trim() === '' ? t('settings.overview.fact.boardUrl.emptyHelper') : t('settings.overview.fact.boardUrl.openHelper')}
						href={props.workspace.boardUrl.trim() === '' ? undefined : props.workspace.boardUrl}
						className="campfire-overview-board-fact"
					/>
				</div>
			</CampfireSurface>

			<div className="campfire-workspace-admin-grid">
				<CampfireSurface className="campfire-workspace-settings-surface campfire-workspace-timezone-surface">
					<div className="campfire-workspace-settings-header">
						<div>
							<p className="campfire-page-eyebrow">{t('settings.overview.timezone.eyebrow')}</p>
							<h3>{t('settings.overview.timezone.title')}</h3>
							<p>{t('settings.overview.timezone.description')}</p>
						</div>
						<Clock3 className="cf:size-5" aria-hidden="true" />
					</div>

					<div className="campfire-field-stack">
						<label htmlFor="campfire-workspace-timezone" className="campfire-field-label">
							{t('settings.overview.timezone.label')}
						</label>
						<CampfireTimezoneSelect
							id="campfire-workspace-timezone"
							value={timezone}
							disabled={!canEditWorkspaceSettings || isSavingTimezone}
							onChange={setTimezone}
						/>
						<p>{t('settings.overview.timezone.helper')}</p>
					</div>

					<div className="campfire-workspace-actions-row">
						<span className={timezoneDirty ? 'campfire-state-text campfire-state-text--dirty' : 'campfire-state-text'}>
							{timezoneDirty ? t('settings.overview.timezone.unsaved') : t('settings.overview.timezone.saved')}
						</span>

						<Button
							type="button"
							disabled={!canEditWorkspaceSettings || isSavingTimezone || !timezoneDirty}
							onClick={() => void handleSaveTimezone()}
						>
							{isSavingTimezone ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Save className="cf:size-4" />}
							{t('settings.overview.timezone.save')}
						</Button>
					</div>
				</CampfireSurface>

				<CampfireSurface className="campfire-workspace-settings-surface campfire-workspace-language-surface">
					<div className="campfire-workspace-settings-header">
						<div>
							<p className="campfire-page-eyebrow">{t('settings.overview.language.eyebrow')}</p>
							<h3>{t('settings.overview.language.title')}</h3>
							<p>{t('settings.overview.language.description')}</p>
						</div>
						<Languages className="cf:size-5" aria-hidden="true" />
					</div>

					<div className="campfire-field-stack">
						<label htmlFor="campfire-workspace-language" className="campfire-field-label">
							{t('settings.overview.language.label')}
						</label>
						<CampfireLanguageSelect
							id="campfire-workspace-language"
							value={generatedMessageLanguage}
							disabled={!canEditWorkspaceSettings || isSavingLanguage}
							onChange={setGeneratedMessageLanguage}
						/>
						<p>{t('settings.overview.language.helper')}</p>
					</div>

					<div className="campfire-workspace-actions-row">
						<span className={languageDirty ? 'campfire-state-text campfire-state-text--dirty' : 'campfire-state-text'}>
							{languageDirty ? t('settings.overview.language.unsaved') : t('settings.overview.language.saved')}
						</span>

						<Button
							type="button"
							disabled={!canEditWorkspaceSettings || isSavingLanguage || !languageDirty}
							onClick={() => void handleSaveLanguage()}
						>
							{isSavingLanguage ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Save className="cf:size-4" />}
							{t('settings.overview.language.save')}
						</Button>
					</div>
				</CampfireSurface>

				<CampfireSurface className="campfire-workspace-danger-surface">
					<div className="campfire-workspace-settings-header">
						<div>
							<p className="campfire-page-eyebrow">{t('settings.overview.danger.eyebrow')}</p>
							<h3>{t('settings.overview.danger.title')}</h3>
							<p>{t('settings.overview.danger.description')}</p>
						</div>
						<AlertTriangle className="cf:size-5" aria-hidden="true" />
					</div>

					<CampfireWorkflowNote
						icon={AlertTriangle}
						title={t('settings.overview.danger.note.title')}
						description={t('settings.overview.danger.note.description')}
					/>

					<div className="campfire-field-stack">
						<label htmlFor="campfire-delete-workspace-confirmation" className="campfire-field-label">
							{t('settings.overview.danger.confirm', { workspaceName: expectedConfirmation })}
						</label>
						<CampfireResponsiveInput
							id="campfire-delete-workspace-confirmation"
							disabled={!canDelete || isDeleting}
							placeholder={expectedConfirmation}
							value={confirmation}
							onValueChange={setConfirmation}
						/>
					</div>

					<div className="campfire-workspace-actions-row">
						<p>{t('settings.overview.danger.permission')}</p>

						<Button
							type="button"
							variant="destructive"
							disabled={!canDelete || !confirmationMatches || isDeleting}
							onClick={() => void handleDeleteWorkspace()}
						>
							{isDeleting ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Trash2 className="cf:size-4" />}
							{t('settings.overview.danger.disconnect')}
						</Button>
					</div>
				</CampfireSurface>
			</div>

			<CampfireSurface className="campfire-workspace-settings-surface">
				<div className="campfire-workspace-settings-header">
					<div>
						<p className="campfire-page-eyebrow">{t('settings.overview.notifications.eyebrow')}</p>
						<h3>{t('settings.overview.notifications.title')}</h3>
						<p>{t('settings.overview.notifications.description')}</p>
					</div>
					<BellRing className="cf:size-5" aria-hidden="true" />
				</div>

				<div className="campfire-workspace-route-summary">
					<OverviewFact icon={BellRing} label={t('settings.overview.notifications.currentTarget')} value={notificationTargetLabel} helper={t('settings.overview.notifications.currentTarget.helper')} />
					<OverviewFact icon={Hash} label={t('settings.overview.notifications.fallback')} value={t('settings.overview.notifications.workspaceChannel')} helper={t('settings.overview.notifications.fallback.helper')} />
				</div>

				<div className="campfire-field-stack">
					<label htmlFor="campfire-approved-leave-notification-channel" className="campfire-field-label">
						{t('settings.overview.notifications.fixedChannelId')}
					</label>
					<CampfireResponsiveInput
						id="campfire-approved-leave-notification-channel"
						disabled={!canEditWorkspaceSettings || isSavingNotifications}
						placeholder={t('settings.overview.notifications.channelPlaceholder', { channelId: props.workspace.channelId })}
						value={notificationChannelID}
						onValueChange={setNotificationChannelID}
					/>
					<p>{t('settings.overview.notifications.channelHelp')}</p>
				</div>

				<div className="campfire-field-stack">
					<label className="campfire-field-label">
						{t('settings.overview.notifications.leaveRecipients')}
					</label>
					<CampfireUserMultiPicker
						workspaceID={props.workspace.id}
						selectedUserIDs={leaveRequestRecipientIDs}
						disabled={!canEditWorkspaceSettings || isSavingNotifications}
						placeholder={t('settings.overview.notifications.leaveRecipients.placeholder')}
						emptyLabel={t('settings.overview.notifications.leaveRecipients.empty')}
						onChange={setLeaveRequestRecipientIDs}
					/>
					<p>{t('settings.overview.notifications.leaveRecipients.help')}</p>
				</div>


				<div className="campfire-workspace-actions-row">
					<Button
						type="button"
						variant="secondary"
						disabled={!canEditWorkspaceSettings || isSavingNotifications || draftNotificationChannelID === ''}
						onClick={handleUseWorkspaceChannel}
					>
						<XCircle className="cf:size-4" />
						{t('settings.overview.notifications.useWorkspaceChannel')}
					</Button>

					<Button
						type="button"
						disabled={!canEditWorkspaceSettings || isSavingNotifications || !notificationDirty}
						onClick={() => void handleSaveNotificationSettings()}
					>
						{isSavingNotifications ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Save className="cf:size-4" />}
						{t('settings.overview.notifications.save')}
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
