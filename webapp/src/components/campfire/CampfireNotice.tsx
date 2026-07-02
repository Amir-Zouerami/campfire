import type { ReactElement, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * CampfireNoticeProps contains one calm inline explanation or footer action.
 */
export type CampfireNoticeProps = {
	readonly children?: ReactNode;
	readonly title?: ReactNode;
	readonly description?: ReactNode;
	readonly icon?: LucideIcon;
	readonly action?: ReactNode;
	readonly className?: string;
};

/**
 * CampfireNotice renders vertically centered explanatory text and optional
 * actions. Use this instead of ad-hoc rounded explanation boxes.
 */
export function CampfireNotice(props: CampfireNoticeProps): ReactElement {
	const Icon = props.icon;
	const hasStructuredCopy = props.title !== undefined || props.description !== undefined;

	return (
		<div className={cn('campfire-notice-row', props.className)}>
			{Icon !== undefined && (
				<span className="campfire-notice-row-icon" aria-hidden="true">
					<Icon className="cf:size-5" />
				</span>
			)}

			<div className="campfire-notice-row-copy">
				{hasStructuredCopy ? (
					<>
						{props.title !== undefined && <strong dir="auto">{props.title}</strong>}
						{props.description !== undefined && <p dir="auto">{props.description}</p>}
					</>
				) : (
					<p dir="auto">{props.children}</p>
				)}
			</div>

			{props.action !== undefined && <div className="campfire-notice-row-action">{props.action}</div>}
		</div>
	);
}
