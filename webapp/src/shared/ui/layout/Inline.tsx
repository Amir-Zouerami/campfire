import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

import { ALIGN_CLASS, GAP_CLASS, JUSTIFY_CLASS } from './spacing';
import type { Align, Gap, Justify } from './spacing';

type InlineProps = {
	readonly children?: ReactNode;
	readonly gap?: Gap;
	readonly align?: Align;
	readonly justify?: Justify;
	readonly wrap?: boolean;
	readonly grow?: boolean;
	readonly as?: 'div' | 'span' | 'nav' | 'header' | 'footer' | 'li';
};

/**
 * Inline lays children out in a row with a consistent gap.
 */
export function Inline(props: InlineProps): ReactElement {
	const Element = props.as ?? 'div';

	return (
		<Element
			className={cn(
				'cf:flex cf:min-w-0 cf:flex-row',
				GAP_CLASS[props.gap ?? 3],
				ALIGN_CLASS[props.align ?? 'center'],
				props.justify && JUSTIFY_CLASS[props.justify],
				props.wrap === true && 'cf:flex-wrap',
				props.grow === true && 'cf:flex-1',
			)}
		>
			{props.children}
		</Element>
	);
}
