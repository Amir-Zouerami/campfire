import type { ReactElement } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Crown, Eye, ShieldCheck, UserCheck, UsersRound } from 'lucide-react';

/**
 * RoleModelExplainer renders static role guidance for admins configuring access.
 */
export function RoleModelExplainer(): ReactElement {
	return (
		<section className="campfire-role-explainer" aria-label="Campfire role guide">
			<div className="campfire-role-explainer-heading">
				<p className="campfire-page-eyebrow">Role guide</p>
				<h3>Who can do what?</h3>
				<p>Members come from the Mattermost channel. Named roles add focused Campfire permissions.</p>
			</div>

			<div className="campfire-role-explainer-grid">
				<RoleExplainerItem icon={UsersRound} title="Members" description="Use My Day: standups, personal tasks, time entries, and leave requests." />
				<RoleExplainerItem icon={Crown} title="Leads" description="Manage workspace settings, forms, schedules, reminders, reports, and Team Review." />
				<RoleExplainerItem icon={UserCheck} title="Approvers" description="Approve or reject leave requests. They do not automatically become workspace Leads." />
				<RoleExplainerItem icon={Eye} title="Viewers" description="View reports and dashboards without changing operational settings." />
				<RoleExplainerItem icon={ShieldCheck} title="Admins" description="Explicit Campfire admins for this workspace. Mattermost system admins still inherit global access." />
			</div>
		</section>
	);
}

/**
 * RoleExplainerItem renders one role definition.
 */
function RoleExplainerItem(props: {
	readonly icon: LucideIcon;
	readonly title: string;
	readonly description: string;
}): ReactElement {
	const Icon = props.icon;

	return (
		<div className="campfire-role-explainer-item">
			<span aria-hidden="true">
				<Icon className="cf:size-5" />
			</span>
			<strong>{props.title}</strong>
			<p>{props.description}</p>
		</div>
	);
}
