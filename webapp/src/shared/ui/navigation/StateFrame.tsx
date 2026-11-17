import type { ReactElement, ReactNode } from 'react';

import { BrandMark } from './BrandMark';

type StateFrameProps = {
	/** Window actions (refresh, close). */
	readonly actions: ReactNode;
	readonly children: ReactNode;
};

/**
 * StateFrame is the minimal window chrome used before a workspace is available:
 * loading, errors, and the setup flow.
 */
export function StateFrame(props: StateFrameProps): ReactElement {
	return (
		<div className="cf:flex cf:h-full cf:flex-col">
			<header className="cf:flex cf:items-center cf:justify-between cf:px-8 cf:pt-6">
				<BrandMark />
				<span className="cf:flex cf:items-center cf:gap-2">{props.actions}</span>
			</header>
			<div className="cf:min-h-0 cf:flex-1 cf:overflow-y-auto cf:px-8 cf:py-8 cf:md:px-16">{props.children}</div>
		</div>
	);
}
