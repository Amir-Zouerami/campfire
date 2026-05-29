import type { ReactElement } from 'react';
import { ShieldCheck } from 'lucide-react';

import type { WorkspaceRoleSettings } from '@/types/domain';

import { formatDateTime } from './roles-access.helpers';
import { CampfireStatusPill } from '@/components/campfire/CampfireLayoutPrimitives';

/**
 * RoleBehaviorPanelProps contains role behavior settings.
 */
type RoleBehaviorPanelProps = {
	readonly settings: WorkspaceRoleSettings;
};

/**
 * RoleBehaviorPanel renders backend role behavior settings.
 */
export function RoleBehaviorPanel(props: RoleBehaviorPanelProps): ReactElement {
	return (
		<section className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5">
			<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-3">
				<div>
					<p className="cf:flex cf:items-center cf:gap-2 cf:text-sm cf:font-semibold cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
						<ShieldCheck className="cf:size-4" />
						Role behavior
					</p>
					<h3 className="cf:mt-1 cf:text-xl cf:font-semibold cf:tracking-[-0.03em] cf:text-foreground">
						Inherited access rules
					</h3>
				</div>

				<CampfireStatusPill tone="slate">Updated {formatDateTime(props.settings.updatedAt)}</CampfireStatusPill>
			</div>

			<div className="cf:grid cf:gap-3 cf:md:grid-cols-2">
				<RoleBehaviorRow
					title="Channel admins are Leads"
					description="Mattermost channel admins inherit workspace management access when enabled."
					enabled={props.settings.channelAdminsAreLeads}
				/>
				<RoleBehaviorRow
					title="System admins are Admins"
					description="Mattermost system admins inherit global Campfire admin access when enabled."
					enabled={props.settings.systemAdminsAreAdmins}
				/>
			</div>
		</section>
	);
}

/**
 * RoleBehaviorRow renders one inherited access setting.
 */
function RoleBehaviorRow(props: {
	readonly title: string;
	readonly description: string;
	readonly enabled: boolean;
}): ReactElement {
	return (
		<article className="cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4">
			<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-2">
				<h4 className="cf:text-base cf:font-semibold cf:text-foreground">{props.title}</h4>
				<CampfireStatusPill tone={props.enabled ? 'green' : 'slate'}>
					{props.enabled ? 'Enabled' : 'Disabled'}
				</CampfireStatusPill>
			</div>
			<p className="cf:mt-2 cf:text-sm cf:font-semibold cf:leading-6 cf:text-muted-foreground">
				{props.description}
			</p>
		</article>
	);
}
