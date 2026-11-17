import type { ElementType, ReactElement, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

import { ALIGN_CLASS, GAP_CLASS, JUSTIFY_CLASS } from './spacing';
import type { Align, Gap, Justify } from './spacing';

type StackProps = {
	readonly children?: ReactNode;
	readonly gap?: Gap;
	readonly align?: Align;
	readonly justify?: Justify;
	/** Lets the element grow to fill free space in its flex parent. */
	readonly grow?: boolean;
	readonly as?: Extract<ElementType, 'div' | 'section' | 'ul' | 'ol' | 'li' | 'nav' | 'header' | 'footer' | 'main' | 'aside' | 'article'>;
};

/**
 * Stack lays children out vertically with a consistent gap.
 */
export function Stack(props: StackProps): ReactElement {
	const Element = props.as ?? 'div';

	return (
		<Element
			className={cn(
				'cf:flex cf:min-w-0 cf:flex-col',
				GAP_CLASS[props.gap ?? 4],
				props.align && ALIGN_CLASS[props.align],
				props.justify && JUSTIFY_CLASS[props.justify],
				props.grow === true && 'cf:flex-1',
			)}
		>
			{props.children}
		</Element>
	);
}
