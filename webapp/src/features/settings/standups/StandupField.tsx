import type { ReactElement, ReactNode } from 'react';

import { Label } from '@/components/ui/label';

/**
 * StandupFieldProps contains a label, optional description, and control.
 */
type StandupFieldProps = {
	readonly htmlFor: string;
	readonly label: string;
	readonly description?: string;
	readonly children: ReactNode;
};

/**
 * StandupField renders consistent labels and helper text for standup controls.
 */
export function StandupField(props: StandupFieldProps): ReactElement {
	return (
		<div className="cf:grid cf:gap-2">
			<Label htmlFor={props.htmlFor}>{props.label}</Label>
			{props.children}
			{props.description !== undefined && props.description.trim() !== '' && (
				<p className="cf:m-0 cf:text-xs cf:font-semibold cf:leading-5 cf:text-muted-foreground">
					{props.description}
				</p>
			)}
		</div>
	);
}
