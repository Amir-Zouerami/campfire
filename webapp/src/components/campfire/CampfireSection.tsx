import type { ReactElement, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * CampfireSectionProps contains one reusable spacious content section.
 */
export type CampfireSectionProps = {
	readonly eyebrow?: string;
	readonly title?: ReactNode;
	readonly description?: ReactNode;
	readonly icon?: LucideIcon;
	readonly meta?: ReactNode;
	readonly actions?: ReactNode;
	readonly children: ReactNode;
	readonly className?: string;
};

/**
 * CampfireSection renders a minimal section shell with a consistent header,
 * spacing, containment, and optional right-side metadata/actions.
 */
export function CampfireSection(props: CampfireSectionProps): ReactElement {
	const Icon = props.icon;

	return (
		<section className={cn('campfire-section', props.className)}>
			{(props.eyebrow !== undefined || props.title !== undefined || props.description !== undefined || props.meta !== undefined || props.actions !== undefined) && (
				<header className="campfire-section-header">
					<div className="campfire-section-title-group">
						{props.eyebrow !== undefined && <p className="campfire-page-eyebrow" dir="auto">{props.eyebrow}</p>}
						{props.title !== undefined && (
							<div className="campfire-section-title-row">
								{Icon !== undefined && (
									<span className="campfire-section-icon" aria-hidden="true">
										<Icon className="cf:size-5" />
									</span>
								)}
								<h3 dir="auto">{props.title}</h3>
							</div>
						)}
						{props.description !== undefined && <p className="campfire-section-description" dir="auto">{props.description}</p>}
					</div>

					{props.meta !== undefined && <div className="campfire-section-meta">{props.meta}</div>}
					{props.actions !== undefined && <div className="campfire-section-actions">{props.actions}</div>}
				</header>
			)}

			<div className="campfire-section-body">{props.children}</div>
		</section>
	);
}
