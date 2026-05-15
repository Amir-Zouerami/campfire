import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';

import { GlobalOffDaysCard } from './GlobalOffDaysCard';
import { LeaveApprovalsCard } from './LeaveApprovalsCard';
import { LeaveRequestCard } from './LeaveRequestCard';
import { MyPendingLeavesCard } from './MyPendingLeavesCard';
import { WorkspaceSetupCard } from './WorkspaceSetupCard';
import { CAMPFIRE_OPEN_EVENT } from './events';
import { useCampfireBootstrap } from './useCampfireBootstrap';
import type { BootstrapStatus } from './useCampfireBootstrap';

/**
 * CampfireRoot is the plugin root mounted by Mattermost.
 *
 * It stays dormant until the user opens Campfire from the channel header button
 * or a future slash-command deep link.
 */
export function CampfireRoot(): ReactElement | null {
	const [isOpen, setIsOpen] = useState(false);
	const [refreshToken, setRefreshToken] = useState(0);
	const [leaveRefreshToken, setLeaveRefreshToken] = useState(0);
	const bootstrap = useCampfireBootstrap(isOpen, refreshToken);

	/**
	 * Refreshes leave panels.
	 */
	function refreshLeaves(): void {
		setLeaveRefreshToken(current => current + 1);
	}

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
			className="cf:fixed cf:inset-0 cf:z-[9999] cf:flex cf:items-center cf:justify-center cf:bg-slate-950/70 cf:p-4 cf:backdrop-blur-md cf:sm:p-8"
			role="dialog"
			aria-modal="true"
			aria-label="Campfire"
		>
			<div className="cf:max-h-[calc(100vh-4rem)] cf:w-full cf:max-w-6xl cf:overflow-auto cf:rounded-[2rem] cf:border cf:border-orange-400/20 cf:bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.18),transparent_34%),linear-gradient(135deg,#08111f_0%,#111827_42%,#020617_100%)] cf:text-slate-50 cf:shadow-[0_32px_110px_rgba(0,0,0,0.58)]">
				<header className="cf:flex cf:flex-col cf:gap-5 cf:border-b cf:border-white/10 cf:p-6 cf:sm:flex-row cf:sm:items-start cf:sm:justify-between cf:sm:p-8">
					<div className="cf:flex cf:items-center cf:gap-4">
						<div className="cf:grid cf:size-14 cf:place-items-center cf:rounded-2xl cf:border cf:border-orange-300/20 cf:bg-orange-500/10 cf:shadow-[inset_0_0_28px_rgba(249,115,22,0.20),0_18px_50px_rgba(249,115,22,0.12)]">
							<span className="cf:text-3xl" aria-hidden="true">
								🔥
							</span>
						</div>

						<div>
							<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-amber-300">
								Mattermost team operations
							</p>
							<h1 className="cf:m-0 cf:mt-1 cf:text-4xl cf:font-black cf:tracking-[-0.05em] cf:text-white">
								Campfire
							</h1>
						</div>
					</div>

					<button
						className="cf:w-fit cf:rounded-full cf:border cf:border-white/15 cf:bg-white/10 cf:px-4 cf:py-2 cf:text-sm cf:font-bold cf:text-white cf:transition cf:hover:bg-white/15 cf:focus:outline-none cf:focus:ring-4 cf:focus:ring-orange-400/20"
						type="button"
						onClick={() => setIsOpen(false)}
					>
						Close
					</button>
				</header>

				<main className="cf:p-6 cf:sm:p-8">
					<section className="cf:grid cf:gap-6 cf:rounded-3xl cf:border cf:border-orange-400/20 cf:bg-white/[0.055] cf:p-6 cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] cf:md:grid-cols-[auto_1fr] cf:md:items-center cf:md:p-7">
						<div className="cf:grid cf:size-20 cf:place-items-center cf:rounded-[1.7rem] cf:bg-orange-500/15 cf:text-4xl cf:shadow-[inset_0_0_36px_rgba(249,115,22,0.22)]">
							🔥
						</div>

						<div>
							<h2 className="cf:m-0 cf:text-3xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
								Gather your team around the fire.
							</h2>
							<p className="cf:mt-3 cf:max-w-3xl cf:text-base cf:leading-7 cf:text-slate-300">
								Campfire turns a Mattermost channel into a warm workspace for standups, leave approvals,
								task time, off-days, and reports.
							</p>
						</div>
					</section>

					<section className="cf:mt-5 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-white/[0.055] cf:p-5">
						<h2 className="cf:m-0 cf:mb-3 cf:text-lg cf:font-black cf:tracking-[-0.03em] cf:text-white">
							Backend connection
						</h2>
						<BootstrapStatusView bootstrap={bootstrap} />
					</section>

					{bootstrap.state === 'ready' && <GlobalOffDaysCard isSystemAdmin={bootstrap.me.isSystemAdmin} />}

					{bootstrap.state === 'ready' && bootstrap.workspace !== null && (
						<>
							<LeaveApprovalsCard
								workspace={bootstrap.workspace}
								refreshToken={leaveRefreshToken}
								onLeaveDecided={refreshLeaves}
							/>
							<MyPendingLeavesCard
								workspace={bootstrap.workspace}
								refreshToken={leaveRefreshToken}
								onLeaveCancelled={refreshLeaves}
							/>
							<LeaveRequestCard workspace={bootstrap.workspace} onLeaveCreated={refreshLeaves} />
						</>
					)}

					{bootstrap.state === 'ready' &&
						bootstrap.workspace === null &&
						bootstrap.channelID !== null &&
						bootstrap.teamID !== null && (
							<WorkspaceSetupCard
								channelID={bootstrap.channelID}
								channelName={bootstrap.channelName}
								teamID={bootstrap.teamID}
								onWorkspaceCreated={() => setRefreshToken(current => current + 1)}
							/>
						)}

					{bootstrap.state === 'ready' &&
						bootstrap.workspace === null &&
						(bootstrap.channelID === null || bootstrap.teamID === null) && (
							<WorkspaceNotice
								message={bootstrap.workspaceNotice ?? 'No Campfire workspace is loaded.'}
							/>
						)}

					<section className="cf:mt-5 cf:grid cf:gap-4 cf:md:grid-cols-3">
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
			return <p className="cf:m-0 cf:text-slate-300">Connecting to Campfire backend…</p>;

		case 'error':
			return (
				<div className="cf:rounded-2xl cf:border cf:border-red-300/25 cf:bg-red-950/30 cf:p-4">
					<strong className="cf:block cf:text-red-100">Could not connect</strong>
					<p className="cf:m-0 cf:mt-1 cf:text-red-100/90">{props.bootstrap.errorMessage}</p>
				</div>
			);

		case 'ready':
			return (
				<div className="cf:grid cf:gap-3 cf:md:grid-cols-4">
					<StatusTile
						label="API"
						value={`${props.bootstrap.health.product} ${props.bootstrap.health.version}`}
					/>
					<StatusTile
						label="User"
						value={props.bootstrap.me.user.displayName || props.bootstrap.me.user.username}
					/>
					<StatusTile label="System admin" value={props.bootstrap.me.isSystemAdmin ? 'Yes' : 'No'} />
					<StatusTile label="Workspace" value={props.bootstrap.workspace?.name ?? 'Not configured'} />
				</div>
			);
	}
}

/**
 * WorkspaceNotice renders current-channel workspace setup state.
 */
function WorkspaceNotice(props: { readonly message: string }): ReactElement {
	return (
		<section className="cf:mt-5 cf:rounded-3xl cf:border cf:border-amber-300/20 cf:bg-amber-300/10 cf:p-6">
			<p className="cf:m-0 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.18em] cf:text-amber-300">
				Workspace
			</p>
			<h2 className="cf:m-0 cf:mt-2 cf:text-2xl cf:font-black cf:tracking-[-0.04em] cf:text-white">
				Workspace not ready
			</h2>
			<p className="cf:m-0 cf:mt-2 cf:max-w-3xl cf:leading-7 cf:text-slate-300">{props.message}</p>
		</section>
	);
}

/**
 * StatusTile renders a compact status metric.
 */
function StatusTile(props: { readonly label: string; readonly value: string }): ReactElement {
	return (
		<div className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/35 cf:p-4">
			<span className="cf:block cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.14em] cf:text-amber-300">
				{props.label}
			</span>
			<strong className="cf:mt-1 cf:block cf:truncate cf:text-base cf:font-black cf:text-white">
				{props.value}
			</strong>
		</div>
	);
}

/**
 * FeatureCard renders one Campfire feature teaser.
 */
function FeatureCard(props: { readonly label: string; readonly title: string }): ReactElement {
	return (
		<article className="cf:min-h-32 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-white/[0.055] cf:p-5 cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
			<span className="cf:inline-flex cf:rounded-full cf:bg-amber-300/10 cf:px-3 cf:py-1 cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.12em] cf:text-amber-300">
				{props.label}
			</span>
			<strong className="cf:mt-4 cf:block cf:text-lg cf:font-black cf:leading-snug cf:text-white">
				{props.title}
			</strong>
		</article>
	);
}
