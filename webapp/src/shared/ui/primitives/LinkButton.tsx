import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

type LinkButtonProps = {
	readonly children: ReactNode;
	readonly onClick: () => void;
	readonly tone?: 'area' | 'muted' | 'danger';
	readonly disabled?: boolean;
};

const TONE_CLASS = {
	area: 'cf:text-blue-ink',
	muted: 'cf:text-muted',
	danger: 'cf:text-rose-ink',
} as const;

/**
 * LinkButton is a text-only action for low-emphasis, inline commands.
 */
export function LinkButton(props: LinkButtonProps): ReactElement {
	return (
		<button
			type="button"
			disabled={props.disabled}
			onClick={props.onClick}
			className={cn(
				'cf:cursor-pointer cf:rounded-sm cf:border-0 cf:bg-transparent cf:p-0 cf:text-[13px] cf:font-bold cf:hover:underline',
				'cf:focus-visible:outline-2 cf:focus-visible:outline-offset-2 cf:focus-visible:outline-area cf:disabled:opacity-50',
				TONE_CLASS[props.tone ?? 'area'],
			)}
		>
			{props.children}
		</button>
	);
}
