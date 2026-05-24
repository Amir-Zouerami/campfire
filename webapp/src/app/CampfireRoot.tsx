import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Flame, Loader2, RefreshCw, X } from 'lucide-react';

import campfireLogoURL from '../../../assets/campfire-logo.svg';

import { CampfireCardBody, CampfireEmpty, CampfirePanel } from './campfire-ui';
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
		function handleOpen(event: Event): void {
			if (!isCampfireOpenEvent(event)) {
				return;
			}

			setIsOpen(true);
		}

		function handleClose(): void {
			setIsOpen(false);
		}

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

	function refreshBootstrap(): void {
		setBootstrapRefreshToken(current => current + 1);
	}

	function refreshLeaves(): void {
		setLeaveRefreshToken(current => current + 1);
	}

	function refreshStandups(): void {
		setStandupRefreshToken(current => current + 1);
	}

	function refreshWorkspaceCalendar(): void {
		setWorkspaceCalendarRefreshToken(current => current + 1);
	}

	function handleWorkspaceArchived(): void {
		refreshBootstrap();
	}

	return createPortal(
		<div className="campfire-overlay campfire-theme dark" role="dialog" aria-modal="true" aria-label="Campfire">
			<div className="campfire-modal">
				<CampfireTopbar bootstrap={bootstrap} onClose={() => setIsOpen(false)} onRefresh={refreshBootstrap} />

				<main className="campfire-scroll">
					<div className="campfire-container">
						<CampfireHero bootstrap={bootstrap} />

						<BootstrapContent
							bootstrap={bootstrap}
							onWorkspaceCreated={refreshBootstrap}
							onWorkspaceArchived={handleWorkspaceArchived}
							leaveRefreshToken={leaveRefreshToken}
							standupRefreshToken={standupRefreshToken}
							workspaceCalendarRefreshToken={workspaceCalendarRefreshToken}
							onLeaveCreated={refreshLeaves}
							onLeaveDecided={refreshLeaves}
							onLeaveCancelled={refreshLeaves}
							onStandupSubmitted={refreshStandups}
							onStandupConfigurationChanged={refreshStandups}
							onWorkspaceCalendarChanged={refreshWorkspaceCalendar}
						/>
					</div>
				</main>
			</div>
		</div>,
		document.body,
	);
}

/**
 * CampfireTopbar renders the modal header.
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
 * CampfireHero renders the compact top overview section.
 */
function CampfireHero(props: { readonly bootstrap: BootstrapStatus }): ReactElement {
	return (
		<section className="campfire-hero campfire-hero--compact">
			<div className="campfire-hero-layout campfire-hero-layout--compact">
				<div className="campfire-hero-copy">
					<div className="campfire-kicker">
						<Flame className="cf:size-4" />
						Team operations
					</div>

					<h2 className="campfire-hero-title">Team rhythm</h2>

					<p className="campfire-hero-description">
						Standups, tasks, time, leave, reminders, reports, and exports in this workspace.
					</p>
				</div>

				<CompactBootstrapSummary bootstrap={props.bootstrap} />
			</div>
		</section>
	);
}

/**
 * CompactBootstrapSummary renders one small status strip instead of large metric cards.
 */
function CompactBootstrapSummary(props: { readonly bootstrap: BootstrapStatus }): ReactElement {
	switch (props.bootstrap.state) {
		case 'idle':
			return <div className="campfire-bootstrap-strip">Idle</div>;

		case 'loading':
			return <div className="campfire-bootstrap-strip">Loading backend…</div>;

		case 'error':
			return <div className="campfire-bootstrap-strip campfire-bootstrap-strip--error">Startup failed</div>;

		case 'ready':
			return (
				<div className="campfire-bootstrap-strip">
					<span>API {props.bootstrap.health.version}</span>
					<span>{userLabel(props.bootstrap.me)}</span>
					<span>{props.bootstrap.me.isSystemAdmin ? 'Admin' : 'Member'}</span>
					<span>{props.bootstrap.workspace?.name ?? 'No workspace'}</span>
				</div>
			);
	}
}

/**
 * BootstrapSummary renders compact startup status metrics.
 */
// function BootstrapSummary(props: { readonly bootstrap: BootstrapStatus }): ReactElement {
// 	switch (props.bootstrap.state) {
// 		case 'idle':
// 			return (
// 				<div className="campfire-metric-grid">
// 					<CampfireMetric label="Status" value="Idle" helper="Not loaded" />
// 				</div>
// 			);

// 		case 'loading':
// 			return (
// 				<div className="campfire-metric-grid">
// 					<CampfireMetric label="Status" value="Loading" helper="Backend checks" icon={Loader2} />
// 				</div>
// 			);

// 		case 'error':
// 			return (
// 				<div className="campfire-metric-grid">
// 					<CampfireMetric label="Status" value="Error" helper="Startup failed" icon={AlertTriangle} />
// 				</div>
// 			);

// 		case 'ready':
// 			return (
// 				<div className="campfire-metric-grid campfire-metric-grid--ready">
// 					<CampfireMetric
// 						label="API"
// 						value={props.bootstrap.health.version}
// 						helper={props.bootstrap.health.product}
// 					/>
// 					<CampfireMetric label="User" value={userLabel(props.bootstrap.me)} helper="Signed in" />
// 					<CampfireMetric
// 						label="Admin"
// 						value={props.bootstrap.me.isSystemAdmin ? 'Yes' : 'No'}
// 						helper="System access"
// 					/>
// 					<CampfireMetric
// 						label="Workspace"
// 						value={props.bootstrap.workspace?.name ?? 'Not configured'}
// 						helper="Current channel"
// 					/>
// 				</div>
// 			);
// 	}
// }

/**
 * BootstrapContent renders the main loaded/empty/error state.
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
	readonly onWorkspaceCalendarChanged: () => void;
}): ReactElement {
	switch (props.bootstrap.state) {
		case 'idle':
		case 'loading':
			return (
				<CampfirePanel>
					<CampfireCardBody>
						<CampfireEmpty
							icon={Loader2}
							title="Lighting Campfire…"
							description="Loading health, current user, Mattermost channel, and workspace configuration."
						/>
					</CampfireCardBody>
				</CampfirePanel>
			);

		case 'error':
			return (
				<CampfirePanel>
					<CampfireCardBody>
						<CampfireEmpty
							icon={AlertTriangle}
							title="Campfire could not start"
							description={props.bootstrap.errorMessage}
						/>
					</CampfireCardBody>
				</CampfirePanel>
			);

		case 'ready':
			return <ReadyContent {...props} bootstrap={props.bootstrap} />;
	}
}

/**
 * ReadyContent renders configured workspace tabs or setup state.
 */
function ReadyContent(props: {
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
	readonly onWorkspaceCalendarChanged: () => void;
}): ReactElement {
	if (props.bootstrap.workspace !== null && props.bootstrap.capabilities !== null) {
		return (
			<CampfireWorkspaceTabs
				workspace={props.bootstrap.workspace}
				capabilities={props.bootstrap.capabilities}
				canManageWorkspace={props.bootstrap.capabilities.canManageWorkspace}
				isSystemAdmin={props.bootstrap.me.isSystemAdmin}
				leaveRefreshToken={props.leaveRefreshToken}
				standupRefreshToken={props.standupRefreshToken}
				workspaceCalendarRefreshToken={props.workspaceCalendarRefreshToken}
				onLeaveCreated={props.onLeaveCreated}
				onLeaveDecided={props.onLeaveDecided}
				onLeaveCancelled={props.onLeaveCancelled}
				onStandupSubmitted={props.onStandupSubmitted}
				onStandupConfigurationChanged={props.onStandupConfigurationChanged}
				onWorkspaceCalendarChanged={props.onWorkspaceCalendarChanged}
				onWorkspaceArchived={props.onWorkspaceArchived}
			/>
		);
	}

	if (props.bootstrap.channelID === null) {
		return (
			<CampfirePanel>
				<CampfireCardBody>
					<CampfireEmpty
						icon={AlertTriangle}
						title="Open Campfire from a channel"
						description={
							props.bootstrap.workspaceNotice ??
							'Campfire needs a Mattermost channel context before it can create or load a workspace.'
						}
					/>
				</CampfireCardBody>
			</CampfirePanel>
		);
	}

	if (props.bootstrap.teamID.trim() === '') {
		return (
			<CampfirePanel>
				<CampfireCardBody>
					<CampfireEmpty
						icon={AlertTriangle}
						title="Mattermost team is missing"
						description="Campfire found the channel, but Mattermost did not expose a team ID. Open Campfire from a normal team channel and try again."
					/>
				</CampfireCardBody>
			</CampfirePanel>
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

/**
 * userLabel returns a readable current-user label.
 */
function userLabel(me: Extract<BootstrapStatus, { readonly state: 'ready' }>['me']): string {
	if (me.user.displayName.trim() !== '') {
		return me.user.displayName;
	}

	if (me.user.username.trim() !== '') {
		return `@${me.user.username}`;
	}

	return me.user.id;
}
