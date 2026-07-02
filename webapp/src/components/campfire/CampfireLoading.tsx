import type { ReactElement } from 'react';

import { cn } from '@/lib/utils';

/**
 * CampfireLoaderSize controls loader visual scale.
 */
type CampfireLoaderSize = 'sm' | 'md' | 'lg';

/**
 * CampfireLoaderProps contains reusable animated loading indicator props.
 */
type CampfireLoaderProps = {
	readonly label: string;
	readonly size?: CampfireLoaderSize;
	readonly className?: string;
};

/**
 * CampfireLoadingStateProps contains full-surface loading copy.
 */
type CampfireLoadingStateProps = {
	readonly title: string;
	readonly description: string;
	readonly className?: string;
};

/**
 * CampfireInlineLoadingProps contains compact inline loading copy.
 */
type CampfireInlineLoadingProps = {
	readonly label: string;
	readonly className?: string;
};

/**
 * CampfireLoader renders Campfire's brand-aligned animated loading mark.
 *
 * The loader uses CSS-only animation so it stays cheap during slow network
 * states and can be reused inside buttons, cards, modals, and page fallbacks.
 */
export function CampfireLoader(props: CampfireLoaderProps): ReactElement {
	const size = props.size ?? 'md';

	return (
		<span
			className={cn('campfire-loader', `campfire-loader--${size}`, props.className)}
			role="status"
			aria-label={props.label}
		>
			<span className="campfire-loader-ring" aria-hidden="true" />
			<span className="campfire-loader-core" aria-hidden="true">
				<span className="campfire-loader-flame campfire-loader-flame--one" />
				<span className="campfire-loader-flame campfire-loader-flame--two" />
				<span className="campfire-loader-flame campfire-loader-flame--three" />
			</span>
		</span>
	);
}

/**
 * CampfireLoadingState renders a polished full-surface loading fallback.
 */
export function CampfireLoadingState(props: CampfireLoadingStateProps): ReactElement {
	return (
		<div className={cn('campfire-loading-state', props.className)} aria-live="polite">
			<CampfireLoader label={props.title} size="lg" />

			<div className="campfire-loading-state-copy">
				<h3 dir="auto">{props.title}</h3>
				<p dir="auto">{props.description}</p>
			</div>
		</div>
	);
}

/**
 * CampfireInlineLoading renders compact animated loading feedback.
 */
export function CampfireInlineLoading(props: CampfireInlineLoadingProps): ReactElement {
	return (
		<span className={cn('campfire-inline-loading', props.className)} aria-live="polite">
			<CampfireLoader label={props.label} size="sm" />
			<span dir="auto">{props.label}</span>
		</span>
	);
}
