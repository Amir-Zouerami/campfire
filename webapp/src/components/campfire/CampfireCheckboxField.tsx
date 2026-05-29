import type { ReactElement } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

/**
 * CampfireCheckboxFieldProps contains one consistently aligned checkbox control.
 */
export type CampfireCheckboxFieldProps = {
	readonly checked: boolean;
	readonly label: string;
	readonly description?: string;
	readonly disabled?: boolean;
	readonly className?: string;
	readonly onCheckedChange: (checked: boolean) => void;
};

/**
 * CampfireInlineCheckboxProps contains compact inline checkbox content.
 */
export type CampfireInlineCheckboxProps = {
	readonly checked: boolean;
	readonly label: string;
	readonly disabled?: boolean;
	readonly className?: string;
	readonly onCheckedChange: (checked: boolean) => void;
};

/**
 * CampfireCheckboxField renders a consistently aligned Campfire checkbox row.
 */
export function CampfireCheckboxField(props: CampfireCheckboxFieldProps): ReactElement {
	return (
		<label
			className={cn(
				'cf:flex cf:items-start cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4 cf:transition',
				props.disabled
					? 'cf:cursor-not-allowed cf:opacity-70'
					: 'cf:cursor-pointer hover:cf:border-amber-300/25',
				props.className,
			)}
		>
			<Checkbox
				className="cf:mt-0.5 cf:shrink-0"
				checked={props.checked}
				disabled={props.disabled}
				onCheckedChange={checked => props.onCheckedChange(checked === true)}
			/>

			<span className="cf:grid cf:min-w-0 cf:gap-1">
				<span className="cf:text-sm cf:font-semibold cf:leading-5 cf:text-foreground">{props.label}</span>

				{props.description !== undefined && props.description.trim() !== '' && (
					<span className="cf:text-xs cf:font-semibold cf:leading-5 cf:text-muted-foreground">
						{props.description}
					</span>
				)}
			</span>
		</label>
	);
}


/**
 * CampfireInlineCheckbox renders compact checkbox controls inside toolbars.
 */
export function CampfireInlineCheckbox(props: CampfireInlineCheckboxProps): ReactElement {
	return (
		<label
			className={cn(
				'campfire-inline-checkbox',
				props.disabled ? 'campfire-inline-checkbox--disabled' : 'campfire-inline-checkbox--interactive',
				props.className,
			)}
		>
			<Checkbox
				checked={props.checked}
				disabled={props.disabled}
				onCheckedChange={checked => props.onCheckedChange(checked === true)}
			/>
			<span>{props.label}</span>
		</label>
	);
}
