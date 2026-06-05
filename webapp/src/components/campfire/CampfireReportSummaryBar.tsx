import type { ReactElement } from 'react';

import { cn } from '@/lib/utils';

/**
 * CampfireReportSummaryItem is one compact report summary datum.
 */
export type CampfireReportSummaryItem = {
	readonly label: string;
	readonly value: string;
	readonly tone?: 'neutral' | 'success' | 'warning' | 'danger';
};

/**
 * CampfireReportSummaryBarProps contains compact summary data for report pages.
 */
export type CampfireReportSummaryBarProps = {
	readonly items: readonly CampfireReportSummaryItem[];
	readonly className?: string;
};

/**
 * CampfireReportSummaryBar renders report metrics as one calm inline row instead
 * of a noisy dashboard of statistic cards.
 */
export function CampfireReportSummaryBar(props: CampfireReportSummaryBarProps): ReactElement | null {
	const visibleItems = props.items.filter(item => item.value.trim() !== '');

	if (visibleItems.length === 0) {
		return null;
	}

	return (
		<div className={cn('campfire-report-summary-bar', props.className)} aria-label="Report summary">
			{visibleItems.map(item => (
				<span
					key={`${item.label}-${item.value}`}
					className={cn('campfire-report-summary-item', item.tone !== undefined && `campfire-report-summary-item--${item.tone}`)}
				>
					<span>{item.label}</span>
					<strong>{item.value}</strong>
				</span>
			))}
		</div>
	);
}
