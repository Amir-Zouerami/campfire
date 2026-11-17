import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

const LEVEL_CLASS = {
	1: 'cf:text-3xl cf:font-extrabold cf:tracking-tight cf:leading-tight',
	2: 'cf:text-xl cf:font-extrabold cf:tracking-tight cf:leading-snug',
	3: 'cf:text-base cf:font-bold cf:leading-snug',
	4: 'cf:text-sm cf:font-bold cf:leading-snug',
} as const;

type HeadingProps = {
	readonly level: keyof typeof LEVEL_CLASS;
	readonly children?: ReactNode;
};

/**
 * Heading renders a semantic heading with Campfire's type scale.
 */
export function Heading(props: HeadingProps): ReactElement {
	const Element = `h${props.level}` as const;

	return <Element className={cn('cf:m-0 cf:text-ink', LEVEL_CLASS[props.level])}>{props.children}</Element>;
}
