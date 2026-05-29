import { useEffect, useState } from 'react';
import type { MouseEvent, ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2, RefreshCw, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import campfireLogoURL from '../../../assets/campfire-logo.svg';

import { CampfireToastHost } from '@/components/campfire/CampfireToastHost';

import { CampfireEmptyState, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';
import { CampfireWorkspaceTabs } from './CampfireWorkspaceTabs';
import { CAMPFIRE_CLOSE_EVENT, CAMPFIRE_OPEN_EVENT, CAMPFIRE_TOGGLE_EVENT, isCampfireOpenEvent } from './events';
import type { BootstrapStatus } from './useCampfireBootstrap';
import { useCampfireBootstrap } from './useCampfireBootstrap';
import { WorkspaceSetupCard } from './WorkspaceSetupCard';

/**
 * CampfireRoot is the plugin root mounted by Mattermost.
 */
export function CampfireRoot(): ReactElement | null {
	const [isOpen, setIsOpen] = useState(false);
	const [bootstrapRefreshToken, setBootstrapRefreshToken] = useState(0);
	const [leaveRefreshToken, setLeaveRefreshToken] = useState(0);
	const [standupRefreshToken, setStandupRefreshToken] = useState(0);
	const [workspaceCalendarRefreshToken, setWorkspaceCalendarRefreshToken] = useState(0);
	const bootstrap = useCampfireBootstrap(isOpen, bootstrapRefreshToken);

	useEffect(() => {
		/**
		 * handleOpen opens the Campfire modal.
		 */
		function handleOpen(event: Event): void {
			if (!isCampfireOpenEvent(event)) {
				return;
			}

			setIsOpen(true);
		}

		/**
		 * handleClose closes the Campfire modal.
		 */
		function handleClose(): void {
			setIsOpen(false);
		}

		/**
		 * handleToggle toggles the Campfire modal.
		 */
		function handleToggle(): void {
			setIsOpen(current => !current);
		}

		window.addEventListener(CAMPFIRE_OPEN_EVENT, handleOpen);
		window.addEventListener(CAMPFIRE_CLOSE_EVENT, handleClose);
		window.addEventListener(CAMPFIRE_TOGGLE_EVENT, handleToggle);

		return () => {
			window.removeEventListener(CAMPFIRE_OPEN_EVENT, handleOpen);
			window.removeEventListener(CAMPFIRE_CLOSE_EVENT, handleClose);
			window.removeEventListener(CAMPFIRE_TOGGLE_EVENT, handleToggle);
		};
	}, []);

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
		}
	}

	const workspaceReady = isConfiguredWorkspaceReady(bootstrap);
	const modalClassName = workspaceReady ? 'campfire-modal campfire-modal--workspace-app' : 'campfire-modal';
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
		onClose: () => setIsOpen(false),
		onRefresh: refreshBootstrap,
	};

	return createPortal(
		<div
			className="campfire-overlay campfire-theme dark"
			role="dialog"
			aria-modal="true"
			aria-label="Campfire"
			onMouseDown={handleOverlayMouseDown}
		>
			<CampfireToastHost />

			<div className={modalClassName}>
				{workspaceReady ? (
					<BootstrapContent {...commonContentProps} />
				) : (
					<>
						<CampfireTopbar bootstrap={bootstrap} onClose={() => setIsOpen(false)} onRefresh={refreshBootstrap} />

						<main className="campfire-scroll">
							<div className="campfire-container">
								<BootstrapContent {...commonContentProps} />
							</div>
						</main>
					</>
				)}
			</div>
		</div>,
		document.body,
	);
}

/**
 * CampfireTopbar renders the modal header for loading and setup states.
 */
function CampfireTopbar(props: {
	readonly bootstrap: BootstrapStatus;
	readonly onClose: () => void;
	readonly onRefresh: () => void;
}): ReactElement {
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
					<p className="campfire-brand-subtitle">{topbarSubtitle(props.bootstrap)}</p>
				</div>
			</div>

			<div className="campfire-topbar-actions">
				<button type="button" className="campfire-header-button" onClick={props.onRefresh}>
					<RefreshCw className="cf:size-5" />
					<span>Refresh</span>
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
	switch (props.bootstrap.state) {
		case 'idle':
			return (
				<BootstrapStateSurface
					icon={Loader2}
					title="Campfire is waiting"
					description="Open Campfire from a Mattermost channel to load workspace data."
				/>
			);

		case 'loading':
			return (
				<BootstrapStateSurface
					icon={Loader2}
					title="Loading Campfire"
					description="Checking Mattermost, workspace setup, permissions, and schedules."
				/>
			);

		case 'error':
			return (
				<BootstrapStateSurface
					icon={AlertTriangle}
					title="Campfire could not load"
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
				title="Open Campfire from a channel"
				description={
					props.bootstrap.workspaceNotice ??
					'Campfire needs a Mattermost channel context before it can create or load a workspace.'
				}
			/>
		);
	}

	if (props.bootstrap.teamID.trim() === '') {
		return (
			<BootstrapStateSurface
				icon={AlertTriangle}
				title="Mattermost team is missing"
				description="Campfire found the channel, but Mattermost did not expose a team ID. Open Campfire from a normal team channel and try again."
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
 * topbarSubtitle returns the secondary topbar text.
 */
function topbarSubtitle(bootstrap: BootstrapStatus): string {
	if (bootstrap.state !== 'ready') {
		return 'Workspace command center';
	}

	if (bootstrap.workspace !== null) {
		return bootstrap.workspace.name;
	}

	if (bootstrap.channelName !== null && bootstrap.channelName.trim() !== '') {
		return `${bootstrap.channelName} setup`;
	}

	return 'Workspace setup';
}
