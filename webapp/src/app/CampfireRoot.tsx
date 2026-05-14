import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

import { CAMPFIRE_OPEN_EVENT } from './events';

/**
 * CampfireRoot is the plugin root mounted by Mattermost.
 *
 * It stays dormant until the user opens Campfire from the channel header button
 * or a future slash-command deep link.
 */
export function CampfireRoot(): ReactElement | null {
	const [isOpen, setIsOpen] = useState(false);

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
								Campfire will become the workspace for standups, leaves, task time, and reports. This is
								the Vite-powered React 18 shell; next we will connect it to the backend and current
								channel.
							</p>
						</div>
					</section>

					<section className="campfire-grid">
						<article className="campfire-card">
							<span>Today</span>
							<strong>Standups, tasks, and who is out.</strong>
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
