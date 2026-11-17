import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

/**
 * WeekGridDay is one column header.
 */
export type WeekGridDay = {
	readonly key: string;
	readonly label: string;
	readonly sublabel: string;
	readonly off?: boolean;
	readonly today?: boolean;
};

/**
 * WeekGridSpan is a bar covering consecutive columns of one row.
 */
export type WeekGridSpan = {
	readonly key: string;
	/** Zero-based column of the first covered day. */
	readonly start: number;
	readonly length: number;
	readonly label: string;
	readonly variant: 'solid' | 'pending';
};

/**
 * WeekGridRow is one person's availability.
 */
export type WeekGridRow = {
	readonly key: string;
	readonly label: ReactNode;
	readonly spans: readonly WeekGridSpan[];
};

type WeekGridProps = {
	readonly days: readonly WeekGridDay[];
	readonly rows: readonly WeekGridRow[];
	readonly caption: string;
};

const NAME_COLUMN_PX = 168;

/**
 * WeekGrid lays people out against days and draws leave as bars across the days they cover.
 * Off days are hatched and today is tinted so a week reads at a glance.
 */
export function WeekGrid(props: WeekGridProps): ReactElement {
	const columns = props.days.length;
	// The name column has one fixed width, shared by the header, the rows and the day shading,
	// so every layer lines up on the same day columns.
	const template = { gridTemplateColumns: `${NAME_COLUMN_PX}px repeat(${columns}, minmax(0, 1fr))` };

	return (
		<div role="table" aria-label={props.caption} className="cf:min-w-[640px]">
			<div role="row" className="cf:grid" style={template}>
				{/* A real (empty-looking) cell: a visually hidden element would leave the grid and shift every day one column over. */}
				<span role="columnheader">
					<span className="cf:sr-only">{props.caption}</span>
				</span>
				{props.days.map(day => (
					<span key={day.key} role="columnheader" className="cf:pb-2.5 cf:text-center cf:text-xs cf:font-semibold cf:text-muted">
						{day.label}
						<span className={cn('cf:block cf:text-[17px] cf:font-bold', day.today === true ? 'cf:text-flame-ink' : 'cf:text-ink')}>
							{day.sublabel}
						</span>
					</span>
				))}
			</div>
			<div className="cf:relative">
				<div
					aria-hidden="true"
					className="cf:pointer-events-none cf:absolute cf:inset-y-0 cf:end-0 cf:grid"
					style={{ insetInlineStart: NAME_COLUMN_PX, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
				>
					{props.days.map(day => (
						<span
							key={day.key}
							className={cn(
								day.off === true && 'cf:bg-[repeating-linear-gradient(135deg,#eceff6_0_6px,#f7f8fc_6px_12px)]',
								day.today === true && 'cf:bg-flame/10',
							)}
						/>
					))}
				</div>
				{props.rows.map(row => (
					<div
						key={row.key}
						role="row"
						className="cf:relative cf:grid cf:h-[52px] cf:items-center cf:border-t cf:border-line"
						style={template}
					>
						<span role="rowheader" className="cf:min-w-0 cf:pe-2">
							{row.label}
						</span>
						{row.spans.map(span => (
							<span
								key={span.key}
								role="cell"
								title={span.label}
								style={{ gridColumn: `${span.start + 2} / span ${span.length}` }}
								className={cn(
									'cf:mx-0.5 cf:flex cf:h-7 cf:items-center cf:truncate cf:rounded-full cf:px-3 cf:text-[12.5px] cf:font-semibold',
									span.variant === 'solid'
										? 'cf:bg-blue cf:text-on-brand'
										: 'cf:border-[1.5px] cf:border-dashed cf:border-blue cf:bg-canvas cf:text-blue-ink',
								)}
							>
								{span.label}
							</span>
						))}
					</div>
				))}
			</div>
		</div>
	);
}
