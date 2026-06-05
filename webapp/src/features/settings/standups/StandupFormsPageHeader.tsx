import type { ReactElement, ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * StandupFormsPageHeaderProps contains shared dedicated-editor header content.
 */
type StandupFormsPageHeaderProps = {
	readonly eyebrow: string;
	readonly title: string;
	readonly description?: string;
	readonly backLabel?: string;
	readonly actions?: ReactNode;
	readonly className?: string;
	readonly onBack?: () => void;
};

/**
 * StandupFormsPageHeader renders a spacious header for full-page form builder flows.
 */
export function StandupFormsPageHeader(props: StandupFormsPageHeaderProps): ReactElement {
	return (
		<header className={cn('campfire-standup-editor-header', props.className)}>
			<div className="campfire-standup-editor-heading">
				{props.onBack !== undefined && (
					<Button type="button" variant="ghost" className="campfire-standup-editor-back" onClick={props.onBack}>
						<ArrowLeft className="cf:size-4" />
						{props.backLabel ?? 'Back'}
					</Button>
				)}

				<p className="campfire-page-eyebrow">{props.eyebrow}</p>
				<h2>{props.title}</h2>
				{props.description !== undefined && props.description.trim() !== '' && <p>{props.description}</p>}
			</div>

			{props.actions !== undefined && <div className="campfire-standup-editor-actions">{props.actions}</div>}
		</header>
	);
}
