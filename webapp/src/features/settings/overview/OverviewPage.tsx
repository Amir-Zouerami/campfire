import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { deleteWorkspace, updateWorkspaceNotificationSettings, updateWorkspaceTimezone } from '@/shared/api';
import { useI18n, languageNativeName, languages } from '@/shared/i18n';
import { useRefreshBootstrap } from '@/shared/query/useRefreshBootstrap';
import { useWorkspaceSession } from '@/shared/session';
import type { Workspace } from '@/shared/types/domain';
import type { CampfireLanguage, LeaveAbsenceScope } from '@/shared/types/domain';
import { UserLabel, UserMultiPicker } from '@/shared/users';
import {
	Anchor,
	Button,
	Container,
	DescriptionList,
	Field,
	Notice,
	PageHeader,
	Section,
	Select,
	Stack,
	StatusText,
	TextInput,
	TimezoneSelect,
	toast,
} from '@/shared/ui';

/**
 * OverviewPage shows how this workspace is connected to its Mattermost channel and holds the
 * workspace-level settings: timezone, generated-message language, leave notifications, and
 * disconnecting Campfire from the channel.
 */
export function OverviewPage(): ReactElement {
	const { t } = useI18n();
	const { workspace } = useWorkspaceSession();

	return (
		<Container>
			<PageHeader
				eyebrow={t('settings.overview.identity.eyebrow')}
				title={workspace.name}
				description={t('settings.overview.identity.description')}
				actions={
					<StatusText kind={workspace.isArchived ? 'inactive' : 'approved'}>
						{workspace.isArchived ? t('common.archived') : t('common.active')}
					</StatusText>
				}
			/>
			<Identity workspace={workspace} />
			<TimezoneSettings workspace={workspace} />
			<LanguageSettings workspace={workspace} />
			<NotificationSettings workspace={workspace} />
			<Disconnect workspace={workspace} />
		</Container>
	);
}

type WorkspaceProps = { readonly workspace: Workspace };

function Identity(props: WorkspaceProps): ReactElement {
	const { t } = useI18n();
	const { workspace } = props;

	return (
		<DescriptionList
			items={[
				{ term: t('settings.overview.fact.channel'), detail: <code dir="ltr">{workspace.channelId}</code> },
				{ term: t('settings.overview.fact.team'), detail: <code dir="ltr">{workspace.teamId}</code> },
				{ term: t('settings.overview.fact.timezone'), detail: <span dir="ltr">{workspace.timezone}</span> },
				{
					term: t('settings.overview.fact.createdBy'),
					detail: workspace.createdBy.trim() === '' ? t('common.unknown') : <UserLabel userID={workspace.createdBy} size="xs" />,
				},
				{
					term: t('settings.overview.fact.boardUrl'),
					detail: workspace.boardUrl.trim() === '' ? t('common.notSet') : <Anchor href={workspace.boardUrl}>{workspace.boardUrl}</Anchor>,
				},
			]}
		/>
	);
}

/**
 * SaveBar shows whether a settings group has unsaved changes next to its save button.
 */
function SaveBar(props: {
	readonly dirty: boolean;
	readonly saving: boolean;
	readonly savedLabel: string;
	readonly unsavedLabel: string;
	readonly saveLabel: string;
	readonly onSave: () => void;
}): ReactElement {
	return (
		<Stack gap={3}>
			<StatusText kind={props.dirty ? 'pending' : 'approved'}>{props.dirty ? props.unsavedLabel : props.savedLabel}</StatusText>
			<div>
				<Button loading={props.saving} disabled={!props.dirty} onClick={props.onSave}>
					{props.saveLabel}
				</Button>
			</div>
		</Stack>
	);
}

function TimezoneSettings(props: WorkspaceProps): ReactElement {
	const { t } = useI18n();
	const refresh = useRefreshBootstrap();
	const [timezone, setTimezone] = useState(props.workspace.timezone);
	const dirty = timezone.trim() !== props.workspace.timezone.trim();

	const save = useMutation({
		mutationFn: () => updateWorkspaceTimezone(props.workspace.id, { timezone: timezone.trim() }),
		onSuccess: () => {
			toast.success(t('settings.overview.timezone.toast.saved'));

			return refresh();
		},
	});

	return (
		<Section
			divided
			eyebrow={t('settings.overview.timezone.eyebrow')}
			title={t('settings.overview.timezone.title')}
			description={t('settings.overview.timezone.description')}
		>
			<Stack gap={4}>
				<Field label={t('settings.overview.timezone.label')} description={t('settings.overview.timezone.helper')}>
					<TimezoneSelect value={timezone} onChange={setTimezone} disabled={save.isPending} />
				</Field>
				<SaveBar
					dirty={dirty}
					saving={save.isPending}
					savedLabel={t('settings.overview.timezone.saved')}
					unsavedLabel={t('settings.overview.timezone.unsaved')}
					saveLabel={t('settings.overview.timezone.save')}
					onSave={() => save.mutate()}
				/>
			</Stack>
		</Section>
	);
}

/**
 * notificationRequest rebuilds the full notification-settings request from a workspace, so that
 * changing one setting never resets the others (the endpoint replaces all of them at once).
 */
function notificationRequest(
	workspace: Workspace,
	changes: Partial<{
		approvedLeaveNotificationChannelId: string;
		leaveRequestNotificationRecipientIds: readonly string[];
		leaveAbsenceScope: LeaveAbsenceScope;
		leaveAbsenceChannelId: string;
		generatedMessageLanguage: CampfireLanguage;
	}>,
) {
	const language = changes.generatedMessageLanguage ?? workspace.generatedMessageLanguage;

	return {
		approvedLeaveNotificationChannelId: changes.approvedLeaveNotificationChannelId ?? workspace.approvedLeaveNotificationChannelId,
		leaveRequestNotificationRecipientIds: changes.leaveRequestNotificationRecipientIds ?? workspace.leaveRequestNotificationRecipientIds,
		leaveNotificationLanguage: language,
		generatedMessageLanguage: language,
		leaveAbsenceScope: changes.leaveAbsenceScope ?? workspace.leaveAbsenceScope,
		leaveAbsenceChannelId: changes.leaveAbsenceChannelId ?? workspace.leaveAbsenceChannelId,
	};
}

function LanguageSettings(props: WorkspaceProps): ReactElement {
	const { t } = useI18n();
	const refresh = useRefreshBootstrap();
	const [language, setLanguage] = useState<CampfireLanguage>(props.workspace.generatedMessageLanguage);
	const dirty = language !== props.workspace.generatedMessageLanguage;

	const save = useMutation({
		mutationFn: () =>
			updateWorkspaceNotificationSettings(props.workspace.id, notificationRequest(props.workspace, { generatedMessageLanguage: language })),
		onSuccess: () => {
			toast.success(t('settings.overview.language.toast.saved'));

			return refresh();
		},
	});

	return (
		<Section
			divided
			eyebrow={t('settings.overview.language.eyebrow')}
			title={t('settings.overview.language.title')}
			description={t('settings.overview.language.description')}
		>
			<Stack gap={4}>
				<Field label={t('settings.overview.language.label')} description={t('settings.overview.language.helper')}>
					<Select
						value={language}
						onChange={value => setLanguage(value as CampfireLanguage)}
						options={languages.map(option => ({ value: option, label: languageNativeName(option) }))}
						disabled={save.isPending}
					/>
				</Field>
				<SaveBar
					dirty={dirty}
					saving={save.isPending}
					savedLabel={t('settings.overview.language.saved')}
					unsavedLabel={t('settings.overview.language.unsaved')}
					saveLabel={t('settings.overview.language.save')}
					onSave={() => save.mutate()}
				/>
			</Stack>
		</Section>
	);
}

function NotificationSettings(props: WorkspaceProps): ReactElement {
	const { t } = useI18n();
	const refresh = useRefreshBootstrap();
	const { workspace } = props;
	const [channelID, setChannelID] = useState(workspace.approvedLeaveNotificationChannelId);
	const [scope, setScope] = useState<LeaveAbsenceScope>(workspace.leaveAbsenceScope);
	const [scopeChannelID, setScopeChannelID] = useState(workspace.leaveAbsenceChannelId);
	const [recipients, setRecipients] = useState<readonly string[]>(workspace.leaveRequestNotificationRecipientIds);

	const dirty =
		channelID.trim() !== workspace.approvedLeaveNotificationChannelId.trim() ||
		scope !== workspace.leaveAbsenceScope ||
		scopeChannelID.trim() !== workspace.leaveAbsenceChannelId.trim() ||
		recipients.join('|') !== workspace.leaveRequestNotificationRecipientIds.join('|');

	const save = useMutation({
		mutationFn: () =>
			updateWorkspaceNotificationSettings(
				workspace.id,
				notificationRequest(workspace, {
					approvedLeaveNotificationChannelId: channelID.trim(),
					leaveRequestNotificationRecipientIds: recipients,
					leaveAbsenceScope: scope,
					leaveAbsenceChannelId: scopeChannelID.trim(),
				}),
			),
		onSuccess: () => {
			toast.success(t('settings.notifications.language.saved'));

			return refresh();
		},
	});

	const target =
		workspace.approvedLeaveNotificationChannelId.trim() === ''
			? t('settings.overview.notifications.workspaceChannel')
			: t('settings.overview.notifications.fixedChannel', { channelId: workspace.approvedLeaveNotificationChannelId.trim() });

	return (
		<Section
			divided
			eyebrow={t('settings.overview.notifications.eyebrow')}
			title={t('settings.overview.notifications.title')}
			description={t('settings.overview.notifications.description')}
		>
			<Stack gap={5}>
				<DescriptionList
					items={[
						{ term: t('settings.overview.notifications.currentTarget'), detail: target },
						{ term: t('settings.overview.notifications.fallback'), detail: t('settings.overview.notifications.workspaceChannel') },
					]}
				/>
				<Field label={t('settings.overview.leaveScope.label')} description={t('settings.overview.leaveScope.help')}>
					<Select
						value={scope}
						onChange={value => setScope(value as LeaveAbsenceScope)}
						options={[
							{ value: 'all_workspaces', label: t('settings.overview.leaveScope.all') },
							{ value: 'channel', label: t('settings.overview.leaveScope.channel') },
							{ value: 'same_workspace', label: t('settings.overview.leaveScope.same') },
						]}
					/>
				</Field>
				{scope === 'channel' && (
					<Field label={t('settings.overview.leaveScope.channelId')} description={t('settings.overview.leaveScope.channelHelp')}>
						<TextInput value={scopeChannelID} onChange={setScopeChannelID} />
					</Field>
				)}
				<Field label={t('settings.overview.notifications.fixedChannelId')} description={t('settings.overview.notifications.channelHelp')}>
					<TextInput
						value={channelID}
						onChange={setChannelID}
						placeholder={t('settings.overview.notifications.channelPlaceholder', { channelId: workspace.channelId })}
					/>
				</Field>
				<Field
					label={t('settings.overview.notifications.leaveRecipients')}
					description={t('settings.overview.notifications.leaveRecipients.help')}
				>
					<UserMultiPicker
						value={recipients}
						onChange={setRecipients}
						placeholder={t('settings.overview.notifications.leaveRecipients.placeholder')}
					/>
				</Field>
				{recipients.length === 0 && <Notice tone="info">{t('settings.overview.notifications.leaveRecipients.empty')}</Notice>}
				<Stack gap={3}>
					<div>
						<Button variant="secondary" disabled={channelID.trim() === ''} onClick={() => setChannelID('')}>
							{t('settings.overview.notifications.useWorkspaceChannel')}
						</Button>
					</div>
					<div>
						<Button loading={save.isPending} disabled={!dirty} onClick={() => save.mutate()}>
							{t('settings.overview.notifications.save')}
						</Button>
					</div>
				</Stack>
			</Stack>
		</Section>
	);
}

function Disconnect(props: WorkspaceProps): ReactElement {
	const { t } = useI18n();
	const refresh = useRefreshBootstrap();
	const [confirmation, setConfirmation] = useState('');
	const matches = confirmation.trim() === props.workspace.name;

	const disconnect = useMutation({
		mutationFn: () => deleteWorkspace(props.workspace.id),
		onSuccess: response => {
			if (response.deleted) {
				toast.success(t('settings.overview.toast.disconnected'));
			} else {
				toast.info(t('settings.overview.toast.alreadyDisconnected'));
			}

			return refresh();
		},
	});

	return (
		<Section
			divided
			eyebrow={t('settings.overview.danger.eyebrow')}
			title={t('settings.overview.danger.title')}
			description={t('settings.overview.danger.description')}
		>
			<Stack gap={4}>
				<Notice tone="warning" title={t('settings.overview.danger.note.title')}>
					{t('settings.overview.danger.note.description')}
				</Notice>
				<Field label={t('settings.overview.danger.confirm', { workspaceName: props.workspace.name })}>
					<TextInput value={confirmation} onChange={setConfirmation} placeholder={props.workspace.name} userContent />
				</Field>
				<div>
					<Button variant="danger" loading={disconnect.isPending} disabled={!matches} onClick={() => disconnect.mutate()}>
						{t('settings.overview.danger.disconnect')}
					</Button>
				</div>
			</Stack>
		</Section>
	);
}
