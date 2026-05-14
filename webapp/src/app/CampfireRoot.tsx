import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';

import { CAMPFIRE_OPEN_EVENT } from './events';
import { useCampfireBootstrap } from './useCampfireBootstrap';
import type { BootstrapStatus } from './useCampfireBootstrap';

import { GlobalOffDaysCard } from './GlobalOffDaysCard';

/**
 * CampfireRoot is the plugin root mounted by Mattermost.
 *
 * It stays dormant until the user opens Campfire from the channel header button
 * or a future slash-command deep link.
 */
export function CampfireRoot(): ReactElement | null {
	const [isOpen, setIsOpen] = useState(false);
	const bootstrap = useCampfireBootstrap(isOpen);

	useEffect(() => {
		/**
		 * Opens the Campfire shell when the plugin dispatches its open event.
		 */
		function handleOpen(): void {
			setIsOpen(true);
		}

		window.addEventListener(CAMPFIRE_OPEN_EVENT, handleOpen);

		return () => {
			window.removeEventListener(CAMPFIRE_OPEN_EVENT, handleOpen);
		};
	}, []);

	if (!isOpen) {
		return null;
	}

	return (
		<div className="campfire-overlay" role="dialog" aria-modal="true" aria-label="Campfire">
			<div className="campfire-shell">
				<header className="campfire-header">
					<div>
						<p className="campfire-eyebrow">Mattermost team operations</p>
						<h1>Campfire</h1>
					</div>

					<button className="campfire-close-button" type="button" onClick={() => setIsOpen(false)}>
						Close
					</button>
				</header>

				<main className="campfire-main">
					<section className="campfire-hero-card">
						<div className="campfire-flame" aria-hidden="true">
							🔥
						</div>

						<div>
							<h2>Gather your team around the fire.</h2>
							<p>
								Campfire will become the workspace for standups, leaves, task time, and reports. The
								frontend now talks to the Go backend through a typed API client.
							</p>
						</div>
					</section>

					<section className="campfire-status-panel">
						<h2>Backend connection</h2>
						<BootstrapStatusView bootstrap={bootstrap} />
					</section>

					{bootstrap.state === 'ready' && <GlobalOffDaysCard isSystemAdmin={bootstrap.me.isSystemAdmin} />}

					<section className="campfire-grid">
						<article className="campfire-card">
							<span>Today</span>
							<strong>Standups, tasks, who is out, and a 09:00 → 09:55 reminder window.</strong>
						</article>

						<article className="campfire-card">
							<span>Leaves</span>
							<strong>Requests, approvals, and availability.</strong>
						</article>

						<article className="campfire-card">
							<span>Reports</span>
							<strong>Markdown previews and global dashboards.</strong>
						</article>
					</section>
				</main>
			</div>
		</div>
	);
}

/**
 * BootstrapStatusView renders initial API connection status.
 */
function BootstrapStatusView(props: { readonly bootstrap: BootstrapStatus }): ReactElement {
	switch (props.bootstrap.state) {
		case 'idle':
		case 'loading':
			return <p className="campfire-muted">Connecting to Campfire backend…</p>;

		case 'error':
			return (
				<div className="campfire-error-box">
					<strong>Could not connect</strong>
					<p>{props.bootstrap.errorMessage}</p>
				</div>
			);

		case 'ready':
			return (
				<div className="campfire-status-grid">
					<div>
						<span>API</span>
						<strong>
							{props.bootstrap.health.product} {props.bootstrap.health.version}
						</strong>
					</div>

					<div>
						<span>User</span>
						<strong>{props.bootstrap.me.user.displayName || props.bootstrap.me.user.username}</strong>
					</div>

					<div>
						<span>System admin</span>
						<strong>{props.bootstrap.me.isSystemAdmin ? 'Yes' : 'No'}</strong>
					</div>
				</div>
			);
	}
}
