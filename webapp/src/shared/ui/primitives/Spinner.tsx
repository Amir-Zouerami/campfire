import { LoaderCircle } from 'lucide-react';
import type { ReactElement } from 'react';

import { cn } from '@/shared/lib/cn';

type SpinnerProps = {
	readonly size?: 'sm' | 'md' | 'lg';
	/** Accessible label announced to assistive technology. */
	readonly label?: string;
};

const SIZE_CLASS = { sm: 'cf:size-4', md: 'cf:size-5', lg: 'cf:size-8' } as const;

/**
 * Spinner indicates indeterminate progress.
 */
export function Spinner(props: SpinnerProps): ReactElement {
	return (
		<span role="status" className="cf:inline-flex">
			<LoaderCircle aria-hidden="true" className={cn('cf:animate-spin cf:text-area', SIZE_CLASS[props.size ?? 'md'])} />
			{props.label !== undefined && <span className="cf:sr-only">{props.label}</span>}
		</span>
	);
}
