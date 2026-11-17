import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';

import { errorMessageOf } from '@/shared/api';
import type { HostContext } from '@/shared/host';
import {
	I18nProvider,
	LanguagePreferenceProvider,
	browserTimezone,
	htmlLangOf,
	directionOf,
	resolveLanguage,
	useI18n,
	useLanguagePreferenceController,
} from '@/shared/i18n';
import { BOOTSTRAP_KEY } from '@/shared/query/keys';
import { ThemePreferenceProvider, useThemePreferenceController } from '@/shared/theme';
import {
	Container,
	EmptyState,
	IconButton,
	LoadingState,
	Modal,
	Notice,
	PortalContainerProvider,
	StateFrame,
	ThemeToggle,
	ToastHost,
} from '@/shared/ui';

import { WorkspaceSetupPage } from '@/features/workspace-setup';

import { ApiErrorToasts } from './ApiErrorToasts';
import { useBootstrap } from './bootstrap';
import type { Bootstrap, BootstrapNotice } from './bootstrap';
import { WorkspaceApp } from './WorkspaceApp';

type CampfireWindowProps = {
	readonly context: HostContext;
	readonly onClose: () => void;
};

/**
 * CampfireWindow is the open Campfire modal. It lives in a root element of its own, appended to
 * the page body, so Campfire's styles, language and text direction never touch Mattermost.
 */
export function CampfireWindow(props: CampfireWindowProps): ReactElement {
	const bootstrap = useBootstrap(props.context);
	const userID = bootstrap.data?.me.user.id ?? null;
	const preference = useLanguagePreferenceController(userID);
	const theme = useThemePreferenceController(userID);
	const [container, setContainer] = useState<HTMLElement | null>(null);

	const language = resolveLanguage({
		preference: preference.preference,
		workspaceLanguage: bootstrap.data?.workspace?.generatedMessageLanguage,
		workspaceTimezone: bootstrap.data?.workspace?.timezone,
		browserTimezone: browserTimezone(),
	});

	return createPortal(
		<div
			ref={setContainer}
			className="cf-root"
			dir={directionOf(language)}
			lang={htmlLangOf(language)}
			data-campfire-language={language}
			data-theme={theme.theme}
		>
			{container !== null && (
				<I18nProvider language={language}>
					<LanguagePreferenceProvider value={preference}>
						<ThemePreferenceProvider value={theme}>
							<PortalContainerProvider container={container}>
								<ApiErrorToasts />
								<Modal open size="app" title="Campfire" onClose={props.onClose}>
									<WindowBody bootstrap={bootstrap} context={props.context} onClose={props.onClose} />
								</Modal>
								<ToastHost />
							</PortalContainerProvider>
						</ThemePreferenceProvider>
					</LanguagePreferenceProvider>
				</I18nProvider>
			)}
		</div>,
		document.body,
	);
}

type WindowBodyProps = {
	readonly bootstrap: ReturnType<typeof useBootstrap>;
	readonly context: HostContext;
	readonly onClose: () => void;
};

/**
 * WindowBody renders whichever state Campfire is in: loading, failed, needs setup, or ready.
 */
function WindowBody(props: WindowBodyProps): ReactElement {
	const { t } = useI18n();
	const queryClient = useQueryClient();
	const { bootstrap } = props;
	const frameActions = (
		<>
			<ThemeToggle />
			<IconButton
				icon={RefreshCw}
				label={t('common.refresh')}
				onClick={() => void queryClient.invalidateQueries({ queryKey: BOOTSTRAP_KEY })}
			/>
			<IconButton icon={X} label={t('workspace.action.close')} onClick={props.onClose} />
		</>
	);

	if (bootstrap.isPending) {
		return (
			<StateFrame actions={frameActions}>
				<LoadingState title={t('root.bootstrap.loading.title')} description={t('root.bootstrap.loading.description')} />
			</StateFrame>
		);
	}

	if (bootstrap.isError) {
		return (
			<StateFrame actions={frameActions}>
				<EmptyState
					icon={AlertTriangle}
					title={t('root.bootstrap.error.title')}
					description={errorMessageOf(bootstrap.error, t('root.bootstrap.error.description.fallback'))}
				/>
			</StateFrame>
		);
	}

	const data = bootstrap.data;
	if (data.workspace !== null && data.capabilities !== null) {
		return <WorkspaceApp workspace={data.workspace} capabilities={data.capabilities} me={data.me} onClose={props.onClose} />;
	}

	return (
		<StateFrame actions={frameActions}>
			<SetupOrNotice data={data} />
		</StateFrame>
	);
}

/**
 * SetupOrNotice shows the workspace setup flow, or explains why one cannot be created here.
 */
function SetupOrNotice(props: { readonly data: Bootstrap }): ReactElement {
	const { t } = useI18n();
	const queryClient = useQueryClient();
	const { data } = props;

	if (data.channelID === null) {
		return (
			<EmptyState
				icon={AlertTriangle}
				title={t('root.bootstrap.missingChannel.title')}
				description={noticeText(data.notice, t) ?? t('root.bootstrap.missingChannel.description')}
			/>
		);
	}

	if (data.teamID.trim() === '') {
		return (
			<EmptyState
				icon={AlertTriangle}
				title={t('root.bootstrap.missingTeam.title')}
				description={t('root.bootstrap.missingTeam.description')}
			/>
		);
	}

	return (
		<Container width="narrow" centered>
			{data.notice === 'not-configured' && <Notice tone="info">{t('root.bootstrap.workspaceNotConfigured.notice')}</Notice>}
			<WorkspaceSetupPage
				channelID={data.channelID}
				channelName={data.channelName}
				teamID={data.teamID}
				onCreated={() => void queryClient.invalidateQueries({ queryKey: BOOTSTRAP_KEY })}
			/>
		</Container>
	);
}

/**
 * noticeText translates a bootstrap notice code.
 */
function noticeText(notice: BootstrapNotice | null, t: ReturnType<typeof useI18n>['t']): string | null {
	switch (notice) {
		case 'direct-message':
			return t('root.bootstrap.invalidChannel.notice');
		case 'no-channel':
			return t('root.bootstrap.missingChannel.notice');
		default:
			return null;
	}
}
