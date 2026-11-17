import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

import { ALIGN_CLASS, GAP_CLASS } from './spacing';
import type { Align, Gap } from './spacing';

/**
 * Columns collapse to a single column on narrow viewports.
 */
const COLUMNS_CLASS = {
	1: 'cf:grid-cols-1',
	2: 'cf:grid-cols-1 cf:md:grid-cols-2',
	3: 'cf:grid-cols-1 cf:md:grid-cols-3',
	4: 'cf:grid-cols-2 cf:md:grid-cols-4',
} as const;

type GridProps = {
	readonly children?: ReactNode;
	readonly columns: keyof typeof COLUMNS_CLASS;
	readonly gap?: Gap;
	readonly align?: Align;
};

/**
 * Grid lays children out in equal responsive columns.
 */
export function Grid(props: GridProps): ReactElement {
	return (
		<div className={cn('cf:grid', COLUMNS_CLASS[props.columns], GAP_CLASS[props.gap ?? 4], props.align && ALIGN_CLASS[props.align])}>
			{props.children}
		</div>
	);
}
