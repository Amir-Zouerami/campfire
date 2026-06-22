import { useEffect, useRef, useState } from 'react';
import type { MouseEvent, ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import campfireLogoURL from '../../../assets/campfire-logo.svg';

import { CampfireToastHost } from '@/components/campfire/CampfireToastHost';
import { CampfireLoadingState } from '@/components/campfire/CampfireLoading';

import { CampfireEmptyState, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';
import { I18nProvider, directionForLanguage, getBrowserTimezone, htmlLangForLanguage, inferLanguageFromTimezone, normalizeLanguage, useI18n } from '@/i18n';
import { campfireQueryKeys } from '@/query';
import type { CampfireLanguage } from '@/i18n';
import { CampfireWorkspaceTabs } from './CampfireWorkspaceTabs';
import { CAMPFIRE_CLOSE_EVENT, CAMPFIRE_OPEN_EVENT, CAMPFIRE_TOGGLE_EVENT, isCampfireOpenEvent } from './events';
import type { CampfireOpenDetail } from './events';
import { getMattermostHostContext } from './mattermostHost';
import type { BootstrapStatus, CampfireBootstrapOpenContext } from './useCampfireBootstrap';
import { useCampfireBootstrap } from './useCampfireBootstrap';
import { WorkspaceSetupCard } from './WorkspaceSetupCard';

/**
 * CampfireRoot is the plugin root mounted by Mattermost.
 */
export function CampfireRoot(): ReactElement | null {
	const queryClient = useQueryClient();
	const openSequenceRef = useRef(0);
	const [isOpen, setIsOpen] = useState(false);
	const [openContext, setOpenContext] = useState<CampfireBootstrapOpenContext | null>(null);
	const [bootstrapRefreshToken, setBootstrapRefreshToken] = useState(0);
	const [leaveRefreshToken, setLeaveRefreshToken] = useState(0);
	const [standupRefreshToken, setStandupRefreshToken] = useState(0);
	const [workspaceCalendarRefreshToken, setWorkspaceCalendarRefreshToken] = useState(0);
	const bootstrap = useCampfireBootstrap(isOpen, openContext, bootstrapRefreshToken);

	useEffect(() => {
		/**
		 * openModal starts a fresh Campfire modal session for the current Mattermost location.
		 */
		function openModal(detail: CampfireOpenDetail = {}): void {
			openSequenceRef.current += 1;
			queryClient.removeQueries({ queryKey: campfireQueryKeys.all });
			setOpenContext(buildOpenContext(detail, openSequenceRef.current));
			setBootstrapRefreshToken(0);
			setLeaveRefreshToken(0);
			setStandupRefreshToken(0);
			setWorkspaceCalendarRefreshToken(0);
			setIsOpen(true);
		}

		/**
		 * handleOpen opens the Campfire modal.
		 */
		function handleOpen(event: Event): void {
			if (!isCampfireOpenEvent(event)) {
				return;
			}

			openModal(event.detail);
		}

		/**
		 * handleClose closes the Campfire modal.
		 */
		function handleClose(): void {
			setIsOpen(false);
			setOpenContext(null);
		}

		/**
		 * handleToggle toggles the Campfire modal.
		 */
		function handleToggle(): void {
			if (isOpen) {
				handleClose();
				return;
			}

			openModal();
		}

		window.addEventListener(CAMPFIRE_OPEN_EVENT, handleOpen);
		window.addEventListener(CAMPFIRE_CLOSE_EVENT, handleClose);
		window.addEventListener(CAMPFIRE_TOGGLE_EVENT, handleToggle);

		return () => {
			window.removeEventListener(CAMPFIRE_OPEN_EVENT, handleOpen);
			window.removeEventListener(CAMPFIRE_CLOSE_EVENT, handleClose);
			window.removeEventListener(CAMPFIRE_TOGGLE_EVENT, handleToggle);
		};
	}, [isOpen, queryClient]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		/**
		 * handleKeyDown closes Campfire on Escape.
		 */
		function handleKeyDown(event: KeyboardEvent): void {
			if (event.key === 'Escape') {
				setIsOpen(false);
				setOpenContext(null);
			}
		}

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		window.addEventListener('keydown', handleKeyDown);

		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [isOpen]);

	if (!isOpen || typeof document === 'undefined') {
		return null;
	}

	/**
	 * refreshBootstrap reloads health, user, workspace, and capabilities.
	 */
	function refreshBootstrap(): void {
		setBootstrapRefreshToken(current => current + 1);
	}

	/**
	 * refreshLeaves reloads leave-dependent UI.
	 */
	function refreshLeaves(): void {
		setLeaveRefreshToken(current => current + 1);
	}

	/**
	 * refreshStandups reloads standup-dependent UI.
	 */
	function refreshStandups(): void {
		setStandupRefreshToken(current => current + 1);
	}

	/**
	 * refreshWorkspaceCalendar reloads workspace calendar dependent UI.
	 */
	function refreshWorkspaceCalendar(): void {
		setWorkspaceCalendarRefreshToken(current => current + 1);
	}

	/**
	 * handleWorkspaceArchived reloads bootstrap state after archive/disconnect.
	 */
	function handleWorkspaceArchived(): void {
		refreshBootstrap();
	}

	/**
	 * handleOverlayMouseDown closes only when the blurred backdrop itself is clicked.
	 */
	function handleOverlayMouseDown(event: MouseEvent<HTMLDivElement>): void {
		if (event.target === event.currentTarget) {
			setIsOpen(false);
			setOpenContext(null);
		}
	}

	const workspaceReady = isConfiguredWorkspaceReady(bootstrap);
	const modalClassName = workspaceReady ? 'campfire-modal campfire-modal--workspace-app' : 'campfire-modal';
	const language = languageForBootstrap(bootstrap);
	const direction = directionForLanguage(language);
	const commonContentProps = {
		bootstrap,
		onWorkspaceCreated: refreshBootstrap,
		onWorkspaceArchived: handleWorkspaceArchived,
		leaveRefreshToken,
		standupRefreshToken,
		workspaceCalendarRefreshToken,
		onLeaveCreated: refreshLeaves,
		onLeaveDecided: refreshLeaves,
		onLeaveCancelled: refreshLeaves,
		onStandupSubmitted: refreshStandups,
		onWorkspaceSettingsChanged: refreshBootstrap,
		onStandupConfigurationChanged: refreshStandups,
		onWorkspaceCalendarChanged: refreshWorkspaceCalendar,
		onClose: () => {
			setIsOpen(false);
			setOpenContext(null);
		},
		onRefresh: refreshBootstrap,
	};

	return createPortal(
		<I18nProvider language={language}>
			<div
				className="campfire-overlay campfire-theme dark"
				role="dialog"
				aria-modal="true"
				aria-label="Campfire"
				dir={direction}
				lang={htmlLangForLanguage(language)}
				data-campfire-language={language}
				onMouseDown={handleOverlayMouseDown}
			>
				<CampfireToastHost />

				<div className={modalClassName}>
					{workspaceReady ? (
						<BootstrapContent {...commonContentProps} />
					) : (
						<>
							<CampfireTopbar
								bootstrap={bootstrap}
								onClose={() => {
									setIsOpen(false);
									setOpenContext(null);
								}}
								onRefresh={refreshBootstrap}
							/>

							<main className="campfire-scroll">
								<div className="campfire-container">
									<BootstrapContent {...commonContentProps} />
								</div>
							</main>
						</>
					)}
				</div>
			</div>
		</I18nProvider>,
		document.body,
	);
}

/**
 * buildOpenContext snapshots the Mattermost channel that should own the modal session.
 */
function buildOpenContext(detail: CampfireOpenDetail, openSequence: number): CampfireBootstrapOpenContext {
	const hostContext = getMattermostHostContext();
	const detailChannelID = cleanOptionalDetail(detail.channelID);
	const hostChannelMatchesDetail = detailChannelID !== null && hostContext.channelID === detailChannelID;

	return {
		openSequence,
		channelID: detailChannelID ?? hostContext.channelID,
		channelName:
			cleanOptionalDetail(detail.channelName) ??
			(hostChannelMatchesDetail || detailChannelID === null ? hostContext.channelName : null),
		channelType:
			cleanOptionalDetail(detail.channelType) ??
			(hostChannelMatchesDetail || detailChannelID === null ? hostContext.channelType : null),
		teamID:
			cleanOptionalDetail(detail.teamID) ??
			(hostChannelMatchesDetail || detailChannelID === null ? hostContext.teamID : null),
	};
}

/**
 * cleanOptionalDetail normalizes blank event-detail strings to null.
 */
function cleanOptionalDetail(value: string | undefined): string | null {
	const cleanValue = value?.trim() ?? '';

	return cleanValue === '' ? null : cleanValue;
}

/**
 * CampfireTopbar renders the modal header for loading and setup states.
 */
function CampfireTopbar(props: {
	readonly bootstrap: BootstrapStatus;
	readonly onClose: () => void;
	readonly onRefresh: () => void;
}): ReactElement {
	const { t } = useI18n();

	return (
		<header className="campfire-topbar">
			<div className="campfire-brand">
				<div className="campfire-logo-tile">
					<img src={campfireLogoURL} alt="Campfire" className="campfire-logo-image" />

					<span className="campfire-logo-embers" aria-hidden="true">
						<span className="campfire-logo-ember campfire-logo-ember--one" />
						<span className="campfire-logo-ember campfire-logo-ember--two" />
						<span className="campfire-logo-ember campfire-logo-ember--three" />
						<span className="campfire-logo-ember campfire-logo-ember--four" />
					</span>
				</div>

				<div className="campfire-brand-copy">
					<h1 className="campfire-brand-title">Campfire</h1>
					<p className="campfire-brand-subtitle">{topbarSubtitle(props.bootstrap, t)}</p>
				</div>
			</div>

			<div className="campfire-topbar-actions">
				<button type="button" className="campfire-header-button" onClick={props.onRefresh}>
					<RefreshCw className="cf:size-5" />
					<span>{t('common.refresh')}</span>
				</button>

				<button
					type="button"
					className="campfire-header-icon-button"
					onClick={props.onClose}
					aria-label="Close Campfire"
				>
					<X className="cf:size-5" />
				</button>
			</div>
		</header>
	);
}

/**
 * BootstrapContent renders the correct body for startup state.
 */
function BootstrapContent(props: {
	readonly bootstrap: BootstrapStatus;
	readonly onWorkspaceCreated: () => void;
	readonly onWorkspaceArchived: () => void;
	readonly leaveRefreshToken: number;
	readonly standupRefreshToken: number;
	readonly workspaceCalendarRefreshToken: number;
	readonly onLeaveCreated: () => void;
	readonly onLeaveDecided: () => void;
	readonly onLeaveCancelled: () => void;
	readonly onStandupSubmitted: () => void;
	readonly onStandupConfigurationChanged: () => void;
	readonly onWorkspaceSettingsChanged: () => void;
	readonly onWorkspaceCalendarChanged: () => void;
	readonly onClose: () => void;
	readonly onRefresh: () => void;
}): ReactElement {
	const { t } = useI18n();

	switch (props.bootstrap.state) {
		case 'idle':
			return (
				<BootstrapLoadingSurface
					title={t('root.bootstrap.idle.title')}
					description={t('root.bootstrap.idle.description')}
				/>
			);

		case 'loading':
			return (
				<BootstrapLoadingSurface
					title={t('root.bootstrap.loading.title')}
					description={t('root.bootstrap.loading.description')}
				/>
			);

		case 'error':
			return (
				<BootstrapStateSurface
					icon={AlertTriangle}
					title={t('root.bootstrap.error.title')}
					description={props.bootstrap.errorMessage}
				/>
			);

		case 'ready':
			return <BootstrapReadyContent {...props} bootstrap={props.bootstrap} />;
	}
}

/**
 * BootstrapReadyContent renders configured workspace or setup state.
 */
function BootstrapReadyContent(props: {
	readonly bootstrap: Extract<BootstrapStatus, { readonly state: 'ready' }>;
	readonly onWorkspaceCreated: () => void;
	readonly onWorkspaceArchived: () => void;
	readonly leaveRefreshToken: number;
	readonly standupRefreshToken: number;
	readonly workspaceCalendarRefreshToken: number;
	readonly onLeaveCreated: () => void;
	readonly onLeaveDecided: () => void;
	readonly onLeaveCancelled: () => void;
	readonly onStandupSubmitted: () => void;
	readonly onStandupConfigurationChanged: () => void;
	readonly onWorkspaceSettingsChanged: () => void;
	readonly onWorkspaceCalendarChanged: () => void;
	readonly onClose: () => void;
	readonly onRefresh: () => void;
}): ReactElement {
	const { t } = useI18n();

	if (props.bootstrap.workspace !== null && props.bootstrap.capabilities !== null) {
		return (
			<CampfireWorkspaceTabs
				workspace={props.bootstrap.workspace}
				capabilities={props.bootstrap.capabilities}
				canManageWorkspace={props.bootstrap.capabilities.canManageWorkspace}
				isSystemAdmin={props.bootstrap.me.isSystemAdmin}
				currentUser={props.bootstrap.me.user}
				leaveRefreshToken={props.leaveRefreshToken}
				standupRefreshToken={props.standupRefreshToken}
				workspaceCalendarRefreshToken={props.workspaceCalendarRefreshToken}
				onClose={props.onClose}
				onRefresh={props.onRefresh}
				onLeaveCreated={props.onLeaveCreated}
				onLeaveDecided={props.onLeaveDecided}
				onLeaveCancelled={props.onLeaveCancelled}
				onStandupSubmitted={props.onStandupSubmitted}
				onStandupConfigurationChanged={props.onStandupConfigurationChanged}
				onWorkspaceCalendarChanged={props.onWorkspaceCalendarChanged}
				onWorkspaceSettingsChanged={props.onWorkspaceSettingsChanged}
				onWorkspaceArchived={props.onWorkspaceArchived}
			/>
		);
	}

	if (props.bootstrap.channelID === null) {
		return (
			<BootstrapStateSurface
				icon={AlertTriangle}
				title={t('root.bootstrap.missingChannel.title')}
				description={props.bootstrap.workspaceNotice ?? t('root.bootstrap.missingChannel.description')}
			/>
		);
	}

	if (props.bootstrap.teamID.trim() === '') {
		return (
			<BootstrapStateSurface
				icon={AlertTriangle}
				title={t('root.bootstrap.missingTeam.title')}
				description={t('root.bootstrap.missingTeam.description')}
			/>
		);
	}

	return (
		<div className="cf:grid cf:gap-5">
			{props.bootstrap.workspaceNotice !== null && (
				<div className="campfire-notice">{props.bootstrap.workspaceNotice}</div>
			)}

			<WorkspaceSetupCard
				channelID={props.bootstrap.channelID}
				channelName={props.bootstrap.channelName}
				teamID={props.bootstrap.teamID}
				onWorkspaceCreated={props.onWorkspaceCreated}
			/>
		</div>
	);
}


/**
 * BootstrapLoadingSurface renders startup loading states with visible motion.
 */
function BootstrapLoadingSurface(props: {
	readonly title: string;
	readonly description: string;
}): ReactElement {
	return (
		<CampfireSurface className="campfire-bootstrap-state-surface">
			<CampfireLoadingState title={props.title} description={props.description} />
		</CampfireSurface>
	);
}

/**
 * BootstrapStateSurface renders startup/fallback states with the same flat
 * surface system used by the workspace app shell.
 */
function BootstrapStateSurface(props: {
	readonly icon: LucideIcon;
	readonly title: string;
	readonly description: string;
}): ReactElement {
	return (
		<CampfireSurface className="campfire-bootstrap-state-surface">
			<CampfireEmptyState icon={props.icon} title={props.title} description={props.description} />
		</CampfireSurface>
	);
}

/**
 * isConfiguredWorkspaceReady returns whether the modal should use the app shell.
 */
function isConfiguredWorkspaceReady(status: BootstrapStatus): boolean {
	return status.state === 'ready' && status.workspace !== null && status.capabilities !== null;
}

/**
 * languageForBootstrap returns the best language available during startup.
 */
function languageForBootstrap(status: BootstrapStatus): CampfireLanguage {
	if (status.state === 'ready' && status.workspace !== null) {
		return normalizeLanguage(
			status.workspace.generatedMessageLanguage,
			inferLanguageFromTimezone(status.workspace.timezone),
		);
	}

	return inferLanguageFromTimezone(getBrowserTimezone());
}

/**
 * topbarSubtitle returns the secondary topbar text.
 */
function topbarSubtitle(
	bootstrap: BootstrapStatus,
	t: ReturnType<typeof useI18n>['t'],
): string {
	if (bootstrap.state !== 'ready') {
		return t('root.topbar.subtitle.commandCenter');
	}

	if (bootstrap.workspace !== null) {
		return bootstrap.workspace.name;
	}

	if (bootstrap.channelName !== null && bootstrap.channelName.trim() !== '') {
		return t('root.topbar.subtitle.channelSetup', { channelName: bootstrap.channelName });
	}

	return t('root.topbar.subtitle.setup');
}
