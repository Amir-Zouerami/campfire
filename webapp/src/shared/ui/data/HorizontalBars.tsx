import type { ReactElement, ReactNode } from 'react';

/**
 * HorizontalBar is one labelled row of HorizontalBars.
 */
export type HorizontalBar = {
	readonly key: string;
	readonly label: ReactNode;
	readonly value: number;
	readonly valueLabel: string;
};

type HorizontalBarsProps = {
	readonly rows: readonly HorizontalBar[];
	/** Bars are scaled against this value; defaults to the largest row. */
	readonly maxValue?: number;
	readonly label: string;
};

/**
 * HorizontalBars compares values across people or projects.
 */
export function HorizontalBars(props: HorizontalBarsProps): ReactElement {
	const max = Math.max(props.maxValue ?? 0, ...props.rows.map(row => row.value), 1);

	return (
		<ul aria-label={props.label} className="cf:m-0 cf:flex cf:list-none cf:flex-col cf:border-t cf:border-line cf:p-0">
			{props.rows.map(row => (
				<li
					key={row.key}
					className="cf:grid cf:min-h-[54.4px] cf:grid-cols-[minmax(0,144px)_1fr_72px] cf:items-center cf:gap-4 cf:border-b cf:border-line"
				>
					<span className="cf:min-w-0">{row.label}</span>
					<span role="presentation" className="cf:h-2 cf:overflow-hidden cf:rounded-full cf:bg-line">
						<span className="cf:block cf:h-full cf:rounded-full cf:bg-brand" style={{ width: `${Math.round((row.value / max) * 100)}%` }} />
					</span>
					<span className="cf:text-end cf:text-[13px] cf:font-bold cf:tabular-nums">{row.valueLabel}</span>
				</li>
			))}
		</ul>
	);
}
