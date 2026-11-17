import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

type StatProps = {
	readonly label: string;
	readonly value: ReactNode;
	readonly caption?: string;
	/** Draws attention with the area colour. */
	readonly emphasis?: boolean;
};

/**
 * Stat is a large figure with a label, used for summary numbers.
 */
export function Stat(props: StatProps): ReactElement {
	return (
		<div className="cf:flex cf:flex-col cf:gap-0.5">
			<span className="cf:text-xs cf:font-extrabold cf:tracking-[0.09em] cf:text-muted cf:uppercase">{props.label}</span>
			<span
				className={cn(
					'cf:text-[32px] cf:leading-tight cf:font-extrabold cf:tracking-tight cf:tabular-nums',
					props.emphasis === true ? 'cf:text-area-ink' : 'cf:text-ink',
				)}
			>
				{props.value}
			</span>
			{props.caption !== undefined && <span className="cf:text-[13px] cf:text-muted">{props.caption}</span>}
		</div>
	);
}
