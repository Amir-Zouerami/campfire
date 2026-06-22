import type { ReactElement } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Crown, Eye, ShieldCheck, UserCheck, UsersRound } from 'lucide-react';

import { useI18n } from '@/i18n';

/**
 * RoleModelExplainer renders static role guidance for admins configuring access.
 */
export function RoleModelExplainer(): ReactElement {
	const { t } = useI18n();

	return (
		<section className="campfire-role-explainer" aria-label={t('settings.roles.guide.ariaLabel')}>
			<div className="campfire-role-explainer-heading">
				<p className="campfire-page-eyebrow">{t('settings.roles.guide.eyebrow')}</p>
				<h3>{t('settings.roles.guide.title')}</h3>
				<p>{t('settings.roles.guide.description')}</p>
			</div>

			<div className="campfire-role-explainer-grid">
				<RoleExplainerItem icon={UsersRound} title={t('settings.roles.role.member')} description={t('settings.roles.guide.member.description')} />
				<RoleExplainerItem icon={Crown} title={t('settings.roles.role.lead')} description={t('settings.roles.guide.lead.description')} />
				<RoleExplainerItem icon={UserCheck} title={t('settings.roles.role.approver')} description={t('settings.roles.guide.approver.description')} />
				<RoleExplainerItem icon={Eye} title={t('settings.roles.role.viewer')} description={t('settings.roles.guide.viewer.description')} />
				<RoleExplainerItem icon={ShieldCheck} title={t('settings.roles.role.admin')} description={t('settings.roles.guide.admin.description')} />
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
			<div className="campfire-role-explainer-item-header">
				<span aria-hidden="true">
					<Icon className="cf:size-5" />
				</span>
				<strong>{props.title}</strong>
			</div>
			<p>{props.description}</p>
		</div>
	);
}
