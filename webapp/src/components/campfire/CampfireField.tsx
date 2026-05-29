import type { ReactElement, ReactNode } from 'react';

import { Label } from '@/components/ui/label';

/**
 * CampfireFieldProps contains a labeled form-control shell.
 */
type CampfireFieldProps = {
	readonly id: string;
	readonly label: string;
	readonly description?: string;
	readonly error?: string;
	readonly children: ReactNode;
};

/**
 * CampfireField renders consistent label, helper text, and error text around one control.
 */
export function CampfireField(props: CampfireFieldProps): ReactElement {
	return (
		<div className="campfire-field cf:grid cf:gap-2">
			<Label htmlFor={props.id}>{props.label}</Label>

			{props.children}

			{props.error !== undefined && props.error.trim() !== '' ? (
				<p className="cf:m-0 cf:text-xs cf:font-bold cf:leading-5 cf:text-red-100">{props.error}</p>
			) : null}

			{props.error === undefined && props.description !== undefined && props.description.trim() !== '' ? (
				<p className="cf:m-0 cf:text-xs cf:font-semibold cf:leading-5 cf:text-muted-foreground">
					{props.description}
				</p>
			) : null}
		</div>
	);
}
