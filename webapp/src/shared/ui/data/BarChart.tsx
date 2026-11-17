import type { ReactElement } from 'react';

import { cn } from '@/shared/lib/cn';

/**
 * Bar is one column of a BarChart.
 */
export type Bar = {
	readonly key: string;
	readonly label: string;
	readonly value: number;
	/** Text above the bar, e.g. "18h 30m". */
	readonly valueLabel: string;
	/** `highlight` marks the current period; `empty` marks a period with no data yet. */
	readonly tone?: 'default' | 'highlight' | 'empty';
};

type BarChartProps = {
	readonly bars: readonly Bar[];
	readonly maxValue: number;
	/** Horizontal grid lines with their labels, from top to bottom. */
	readonly ticks: readonly { readonly value: number; readonly label: string }[];
	/** Text alternative describing the chart's data. */
	readonly summary: string;
};

const WIDTH = 520;
const HEIGHT = 250;
const LEFT = 40;
const TOP = 30;
const BASELINE = 210;

/**
 * BarChart is a lightweight vertical bar chart drawn as SVG. Charts always read left to
 * right, as time does, regardless of the page direction.
 */
export function BarChart(props: BarChartProps): ReactElement {
	const plotHeight = BASELINE - TOP;
	const slot = (WIDTH - LEFT) / Math.max(props.bars.length, 1);
	const barWidth = Math.min(44, slot * 0.6);
	const yFor = (value: number): number => BASELINE - (Math.min(value, props.maxValue) / Math.max(props.maxValue, 1)) * plotHeight;

	return (
		<svg
			viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
			role="img"
			aria-label={props.summary}
			direction="ltr"
			className="cf:h-auto cf:w-full cf:max-w-[544px]"
		>
			{props.ticks.map(tick => (
				<g key={tick.value}>
					<line
						x1={LEFT - 6}
						x2={WIDTH}
						y1={yFor(tick.value)}
						y2={yFor(tick.value)}
						className={tick.value === 0 ? 'cf:stroke-line-strong' : 'cf:stroke-line'}
					/>
					<text x={LEFT - 12} y={yFor(tick.value) + 4} textAnchor="end" fontSize="11.5" className="cf:fill-muted">
						{tick.label}
					</text>
				</g>
			))}
			{props.bars.map((bar, index) => {
				const centre = LEFT + slot * index + slot / 2;
				const top = yFor(bar.value);

				return (
					<g key={bar.key}>
						{bar.tone === 'empty' || bar.value <= 0 ? (
							<line
								x1={centre - 10}
								x2={centre + 10}
								y1={BASELINE - 1}
								y2={BASELINE - 1}
								strokeWidth="2"
								strokeDasharray="2 6"
								strokeLinecap="round"
								className="cf:stroke-line-strong"
							/>
						) : (
							<>
								<rect
									x={centre - barWidth / 2}
									y={top}
									width={barWidth}
									height={BASELINE - top}
									rx="8"
									className={bar.tone === 'highlight' ? 'cf:fill-flame' : 'cf:fill-brand'}
								/>
								<text x={centre} y={top - 7} textAnchor="middle" fontSize="12" fontWeight="700" className="cf:fill-ink">
									{bar.valueLabel}
								</text>
							</>
						)}
						<text
							x={centre}
							y={BASELINE + 22}
							textAnchor="middle"
							fontSize="12"
							fontWeight={bar.tone === 'highlight' ? 700 : 400}
							className={cn(bar.tone === 'highlight' ? 'cf:fill-ink' : 'cf:fill-muted')}
						>
							{bar.label}
						</text>
					</g>
				);
			})}
		</svg>
	);
}
