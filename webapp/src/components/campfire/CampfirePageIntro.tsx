import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * CampfirePageIntroProps contains a spacious focused-page title card.
 */
export type CampfirePageIntroProps = {
	readonly eyebrow: string;
	readonly title: string;
	readonly description: string;
	readonly actions?: ReactNode;
	readonly className?: string;
};

/**
 * CampfirePageIntro renders the single title-card pattern used by focused pages.
 */
export function CampfirePageIntro(props: CampfirePageIntroProps): ReactElement {
	return (
		<header className={cn('campfire-page-intro-card', props.className)}>
			<div className="campfire-page-intro-copy">
				<p className="campfire-page-eyebrow" dir="auto">{props.eyebrow}</p>
				<h2 dir="auto">{props.title}</h2>
				<p dir="auto">{props.description}</p>
			</div>

			{props.actions !== undefined && <div className="campfire-page-intro-actions">{props.actions}</div>}
		</header>
	);
}
