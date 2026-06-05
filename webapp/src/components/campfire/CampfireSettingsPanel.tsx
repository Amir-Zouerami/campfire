import type { ReactElement, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * CampfireSettingsPanelProps contains one flat, focused settings section.
 */
export type CampfireSettingsPanelProps = {
	readonly eyebrow?: string;
	readonly title: string;
	readonly description?: string;
	readonly icon?: LucideIcon;
	readonly meta?: ReactNode;
	readonly actions?: ReactNode;
	readonly children: ReactNode;
	readonly className?: string;
};

/**
 * CampfireSettingsPanel renders one spacious settings section without nested
 * dashboard cards. Use this for settings pages instead of ad-hoc title boxes.
 */
export function CampfireSettingsPanel(props: CampfireSettingsPanelProps): ReactElement {
	const Icon = props.icon;

	return (
		<section className={cn('campfire-settings-panel', props.className)}>
			<header className="campfire-settings-panel-header">
				<div className="campfire-settings-panel-title-group">
					{props.eyebrow !== undefined && <p className="campfire-page-eyebrow">{props.eyebrow}</p>}
					<div className="campfire-settings-panel-title-row">
						{Icon !== undefined && (
							<span className="campfire-settings-panel-icon" aria-hidden="true">
								<Icon className="cf:size-5" />
							</span>
						)}
						<h3>{props.title}</h3>
					</div>
					{props.description !== undefined && <p>{props.description}</p>}
				</div>

				{props.meta !== undefined && <div className="campfire-settings-panel-meta">{props.meta}</div>}
				{props.actions !== undefined && <div className="campfire-settings-panel-actions">{props.actions}</div>}
			</header>

			<div className="campfire-settings-panel-body">{props.children}</div>
		</section>
	);
}
