import type { ReactElement } from 'react';
import { ShieldAlert } from 'lucide-react';

/**
 * RolesAssignmentNotice explains the current role-assignment limitation.
 */
export function RolesAssignmentNotice(): ReactElement {
	return (
		<section className="cf:rounded-3xl cf:border cf:border-amber-300/25 cf:bg-amber-950/25 cf:p-5">
			<div className="cf:flex cf:gap-3">
				<ShieldAlert className="cf:mt-1 cf:size-5 cf:shrink-0 cf:text-amber-200" />
				<div>
					<p className="cf:text-sm cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
						Assignment controls pending
					</p>
					<h3 className="cf:mt-1 cf:text-xl cf:font-black cf:tracking-[-0.03em] cf:text-foreground">
						This page is currently read-only
					</h3>
					<p className="cf:mt-2 cf:text-sm cf:font-semibold cf:leading-7 cf:text-slate-300">
						The current frontend/backend contract exposes role overview loading, but not create/delete
						role-assignment endpoints. Do not fake this in the frontend. The next backend step should add
						role assignment APIs and a user picker.
					</p>
				</div>
			</div>
		</section>
	);
}
