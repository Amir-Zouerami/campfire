import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

const TONE_CLASS = {
	neutral: 'cf:bg-sunken cf:text-muted',
	blue: 'cf:bg-blue-soft cf:text-blue-ink',
	violet: 'cf:bg-violet-soft cf:text-violet-ink',
	teal: 'cf:bg-teal-soft cf:text-teal-ink',
	rose: 'cf:bg-rose-soft cf:text-rose-ink',
	flame: 'cf:bg-flame-soft cf:text-flame-ink',
} as const;

type TagProps = {
	readonly children: ReactNode;
	readonly tone?: keyof typeof TONE_CLASS;
};

/**
 * Tag is a compact label for categories (leave type, task status, role).
 */
export function Tag(props: TagProps): ReactElement {
	return (
		<span
			className={cn(
				'cf:inline-flex cf:items-center cf:rounded-md cf:px-2 cf:py-0.5 cf:text-xs cf:font-semibold',
				TONE_CLASS[props.tone ?? 'neutral'],
			)}
		>
			{props.children}
		</span>
	);
}
