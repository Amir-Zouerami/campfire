import type { ReactElement } from 'react';

import logoURL from '@assets/campfire-logo.svg';

type BrandMarkProps = {
	readonly size?: 'sm' | 'md';
};

/**
 * BrandMark is the Campfire logo with its wordmark.
 */
export function BrandMark(props: BrandMarkProps): ReactElement {
	return (
		<span className="cf:flex cf:items-center cf:gap-3">
			<img src={logoURL} alt="" className={props.size === 'sm' ? 'cf:size-8' : 'cf:size-[38px]'} />
			<span className="cf:text-lg cf:font-extrabold cf:tracking-tight cf:text-ink">Campfire</span>
		</span>
	);
}
