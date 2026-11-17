import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

/**
 * Status dots differ in fill, not only in colour, so they stay readable for colour-blind users:
 * solid = settled, hollow ring = waiting, grey = inactive.
 */
const DOT_CLASS = {
	approved: 'cf:bg-blue',
	done: 'cf:bg-teal',
	pending: 'cf:border-2 cf:border-flame cf:bg-surface',
	attention: 'cf:bg-flame',
	rejected: 'cf:bg-rose',
	inactive: 'cf:bg-subtle',
	waiting: 'cf:border-2 cf:border-subtle cf:bg-surface',
} as const;

export type StatusKind = keyof typeof DOT_CLASS;

type StatusTextProps = {
	readonly kind: StatusKind;
	readonly children: ReactNode;
};

/**
 * StatusText pairs a status dot with its label.
 */
export function StatusText(props: StatusTextProps): ReactElement {
	return (
		<span className="cf:inline-flex cf:items-center cf:gap-2 cf:text-[13px] cf:font-semibold cf:text-ink">
			<span aria-hidden="true" className={cn('cf:size-[9px] cf:shrink-0 cf:rounded-full', DOT_CLASS[props.kind])} />
			{props.children}
		</span>
	);
}
