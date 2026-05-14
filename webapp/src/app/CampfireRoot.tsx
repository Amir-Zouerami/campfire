import { useEffect, useState, type ReactElement } from 'react';

import { GlobalOffDaysCard } from './GlobalOffDaysCard';
import { CAMPFIRE_OPEN_EVENT } from './events';
import { useCampfireBootstrap, type BootstrapStatus } from './useCampfireBootstrap';

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
		<div
			className="fixed inset-0 z-9999 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md sm:p-8"
			role="dialog"
			aria-modal="true"
			aria-label="Campfire"
		>
			<div className="max-h-[calc(100vh-4rem)] w-full max-w-6xl overflow-auto rounded-4xl border border-orange-400/20 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.18),transparent_34%),linear-gradient(135deg,#08111f_0%,#111827_42%,#020617_100%)] text-slate-50 shadow-[0_32px_110px_rgba(0,0,0,0.58)]">
				<header className="flex flex-col gap-5 border-b border-white/10 p-6 sm:flex-row sm:items-start sm:justify-between sm:p-8">
					<div className="flex items-center gap-4">
						<div className="grid size-14 place-items-center rounded-2xl border border-orange-300/20 bg-orange-500/10 shadow-[inset_0_0_28px_rgba(249,115,22,0.20),0_18px_50px_rgba(249,115,22,0.12)]">
							<span className="text-3xl" aria-hidden="true">
								🔥
							</span>
						</div>

						<div>
							<p className="m-0 text-xs font-extrabold uppercase tracking-[0.18em] text-amber-300">
								Mattermost team operations
							</p>
							<h1 className="m-0 mt-1 text-4xl font-black tracking-tighter text-white">Campfire</h1>
						</div>
					</div>

					<button
						className="w-fit rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-orange-400/20"
						type="button"
						onClick={() => setIsOpen(false)}
					>
						Close
					</button>
				</header>

				<main className="p-6 sm:p-8">
					<section className="grid gap-6 rounded-3xl border border-orange-400/20 bg-white/5.5 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:grid-cols-[auto_1fr] md:items-center md:p-7">
						<div className="grid size-20 place-items-center rounded-[1.7rem] bg-orange-500/15 text-4xl shadow-[inset_0_0_36px_rgba(249,115,22,0.22)]">
							🔥
						</div>

						<div>
							<h2 className="m-0 text-3xl font-black tracking-[-0.04em] text-white">
								Gather your team around the fire.
							</h2>
							<p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
								Campfire will become the workspace for standups, leaves, task time, and reports. The
								frontend now talks to the Go backend through a typed API client.
							</p>
						</div>
					</section>

					<section className="mt-5 rounded-3xl border border-white/10 bg-white/5.5 p-5">
						<h2 className="m-0 mb-3 text-lg font-black tracking-[-0.03em] text-white">
							Backend connection
						</h2>
						<BootstrapStatusView bootstrap={bootstrap} />
					</section>

					{bootstrap.state === 'ready' && <GlobalOffDaysCard isSystemAdmin={bootstrap.me.isSystemAdmin} />}

					<section className="mt-5 grid gap-4 md:grid-cols-3">
						<FeatureCard
							label="Today"
							title="Standups, tasks, who is out, and a 09:00 → 09:55 reminder window."
						/>
						<FeatureCard
							label="Leaves"
							title="Approval-required leave, holidays, off-days, and availability."
						/>
						<FeatureCard
							label="Reports"
							title="Markdown previews, global dashboards, and polished summaries."
						/>
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
			return <p className="m-0 text-slate-300">Connecting to Campfire backend…</p>;

		case 'error':
			return (
				<div className="rounded-2xl border border-red-300/25 bg-red-950/30 p-4">
					<strong className="block text-red-100">Could not connect</strong>
					<p className="m-0 mt-1 text-red-100/90">{props.bootstrap.errorMessage}</p>
				</div>
			);

		case 'ready':
			return (
				<div className="grid gap-3 md:grid-cols-3">
					<StatusTile
						label="API"
						value={`${props.bootstrap.health.product} ${props.bootstrap.health.version}`}
					/>
					<StatusTile
						label="User"
						value={props.bootstrap.me.user.displayName || props.bootstrap.me.user.username}
					/>
					<StatusTile label="System admin" value={props.bootstrap.me.isSystemAdmin ? 'Yes' : 'No'} />
				</div>
			);
	}
}

/**
 * StatusTile renders a compact status metric.
 */
function StatusTile(props: { readonly label: string; readonly value: string }): ReactElement {
	return (
		<div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
			<span className="block text-xs font-extrabold uppercase tracking-[0.14em] text-amber-300">
				{props.label}
			</span>
			<strong className="mt-1 block truncate text-base font-black text-white">{props.value}</strong>
		</div>
	);
}

/**
 * FeatureCard renders one Campfire feature teaser.
 */
function FeatureCard(props: { readonly label: string; readonly title: string }): ReactElement {
	return (
		<article className="min-h-32 rounded-3xl border border-white/10 bg-white/5.5 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
			<span className="inline-flex rounded-full bg-amber-300/10 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.12em] text-amber-300">
				{props.label}
			</span>
			<strong className="mt-4 block text-lg font-black leading-snug text-white">{props.title}</strong>
		</article>
	);
}
