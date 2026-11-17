import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

const WIDTH_CLASS = {
	narrow: 'cf:max-w-3xl',
	regular: 'cf:max-w-6xl',
	wide: 'cf:max-w-7xl',
} as const;

type ContainerProps = {
	readonly children: ReactNode;
	readonly width?: keyof typeof WIDTH_CLASS;
	/** Centres the container in its parent. */
	readonly centered?: boolean;
};

/**
 * Container constrains content to a readable width.
 */
export function Container(props: ContainerProps): ReactElement {
	return (
		<div
			className={cn(
				'cf:flex cf:w-full cf:flex-col cf:gap-5',
				WIDTH_CLASS[props.width ?? 'regular'],
				props.centered === true && 'cf:mx-auto',
			)}
		>
			{props.children}
		</div>
	);
}
