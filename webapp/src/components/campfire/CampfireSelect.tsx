import type { ChangeEvent, ReactElement, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * CampfireSelectProps contains a native select styled like Campfire inputs.
 */
type CampfireSelectProps = {
	readonly id: string;
	readonly value: string;
	readonly disabled?: boolean;
	readonly className?: string;
	readonly children: ReactNode;
	readonly onValueChange: (value: string) => void;
};

/**
 * CampfireSelect renders a consistently styled native select.
 *
 * This intentionally stays native for now instead of using a portal-based
 * dropdown because Campfire runs inside Mattermost and should avoid body
 * portals unless a component is explicitly adapted for that environment.
 */
export function CampfireSelect(props: CampfireSelectProps): ReactElement {
	/**
	 * handleChange forwards only the selected value.
	 */
	function handleChange(event: ChangeEvent<HTMLSelectElement>): void {
		props.onValueChange(event.currentTarget.value);
	}

	return (
		<select
			id={props.id}
			className={cn(campfireSelectClassName(), props.className)}
			disabled={props.disabled}
			value={props.value}
			onChange={handleChange}
		>
			{props.children}
		</select>
	);
}

/**
 * campfireSelectClassName returns the shared native select style.
 */
export function campfireSelectClassName(): string {
	return cn(
		'cf:h-12 cf:w-full cf:rounded-2xl cf:border cf:border-input cf:bg-background/75 cf:px-4 cf:py-2',
		'cf:text-base cf:font-semibold cf:text-foreground cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
		'cf:outline-none cf:transition-[color,box-shadow,background-color,border-color]',
		'cf:hover:border-white/20 cf:hover:bg-background/90',
		'cf:focus-visible:border-ring cf:focus-visible:ring-3 cf:focus-visible:ring-ring/30',
		'cf:disabled:cursor-not-allowed cf:disabled:opacity-50',
	);
}
