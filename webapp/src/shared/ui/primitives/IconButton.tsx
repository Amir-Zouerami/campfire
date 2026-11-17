import type { LucideIcon } from 'lucide-react';
import type { ReactElement } from 'react';

import { cn } from '@/shared/lib/cn';

import { Icon } from './Icon';

/** `lg` matches the height of a form control, for buttons that sit beside one. */
const SIZE_CLASS = { sm: 'cf:size-8', md: 'cf:size-[38px]', lg: 'cf:size-11' } as const;

type IconButtonProps = {
	readonly icon: LucideIcon;
	/** Required: an icon-only control has no visible text, so it needs an accessible name. */
	readonly label: string;
	readonly onClick?: () => void;
	readonly disabled?: boolean;
	readonly variant?: 'outline' | 'ghost';
	readonly size?: 'sm' | 'md' | 'lg';
	readonly mirror?: boolean;
	readonly pressed?: boolean;
};

/**
 * IconButton is an icon-only action with a mandatory accessible label.
 */
export function IconButton(props: IconButtonProps): ReactElement {
	return (
		<button
			type="button"
			title={props.label}
			aria-label={props.label}
			aria-pressed={props.pressed}
			disabled={props.disabled}
			onClick={props.onClick}
			className={cn(
				'cf:inline-grid cf:shrink-0 cf:cursor-pointer cf:place-items-center cf:rounded-control cf:text-muted cf:transition-colors',
				'cf:hover:bg-sunken cf:hover:text-ink cf:focus-visible:outline-2 cf:focus-visible:outline-offset-2 cf:focus-visible:outline-area',
				'cf:disabled:cursor-not-allowed cf:disabled:opacity-50',
				SIZE_CLASS[props.size ?? 'md'],
				(props.variant ?? 'outline') === 'outline'
					? 'cf:border cf:border-line cf:bg-surface'
					: 'cf:border cf:border-transparent cf:bg-transparent',
			)}
		>
			<Icon icon={props.icon} size="md" mirror={props.mirror} />
		</button>
	);
}
