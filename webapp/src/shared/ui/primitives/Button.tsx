import type { LucideIcon } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

import { Icon } from './Icon';
import { Spinner } from './Spinner';

const VARIANT_CLASS = {
	primary: 'cf:bg-brand cf:text-on-brand cf:border-brand cf:hover:bg-brand-hover',
	secondary: 'cf:bg-surface cf:text-ink cf:border-line-strong cf:hover:bg-sunken',
	ghost: 'cf:bg-transparent cf:text-muted cf:border-transparent cf:hover:bg-sunken cf:hover:text-ink',
	danger: 'cf:bg-rose cf:text-on-brand cf:border-rose cf:hover:opacity-90',
} as const;

const SIZE_CLASS = {
	sm: 'cf:h-9 cf:px-3.5 cf:text-[13px]',
	md: 'cf:h-[42px] cf:px-5 cf:text-sm',
} as const;

export type ButtonProps = {
	readonly children?: ReactNode;
	readonly variant?: keyof typeof VARIANT_CLASS;
	readonly size?: keyof typeof SIZE_CLASS;
	readonly icon?: LucideIcon;
	readonly loading?: boolean;
	readonly disabled?: boolean;
	readonly type?: 'button' | 'submit' | 'reset';
	readonly onClick?: () => void;
	readonly fullWidth?: boolean;
};

/**
 * Button is Campfire's single action control.
 */
export function Button(props: ButtonProps): ReactElement {
	const isDisabled = props.disabled === true || props.loading === true;

	return (
		<button
			type={props.type ?? 'button'}
			disabled={isDisabled}
			aria-busy={props.loading === true ? true : undefined}
			onClick={props.onClick}
			className={cn(
				'cf:inline-flex cf:shrink-0 cf:cursor-pointer cf:items-center cf:justify-center cf:gap-2 cf:rounded-control cf:border cf:font-bold cf:whitespace-nowrap cf:transition-colors',
				'cf:focus-visible:outline-2 cf:focus-visible:outline-offset-2 cf:focus-visible:outline-area',
				'cf:disabled:cursor-not-allowed cf:disabled:opacity-55',
				VARIANT_CLASS[props.variant ?? 'primary'],
				SIZE_CLASS[props.size ?? 'md'],
				props.fullWidth === true && 'cf:w-full',
			)}
		>
			{props.loading === true ? <Spinner size="sm" /> : props.icon !== undefined && <Icon icon={props.icon} size="sm" />}
			{props.children}
		</button>
	);
}
