import type { LucideIcon } from 'lucide-react';
import type { ReactElement } from 'react';

import { cn } from '@/lib/utils';

/**
 * CampfireSegmentedTab describes one item in modern Campfire section navigation.
 */
export type CampfireSegmentedTab<TValue extends string> = {
	readonly value: TValue;
	readonly label: string;
	readonly description?: string;
	readonly icon?: LucideIcon;
};

/**
 * CampfireSegmentedTabsProps contains controlled segmented navigation state.
 */
type CampfireSegmentedTabsProps<TValue extends string> = {
	readonly tabs: readonly CampfireSegmentedTab<TValue>[];
	readonly activeValue: TValue;
	readonly label: string;
	readonly className?: string;
	readonly onChange: (value: TValue) => void;
};

/**
 * CampfireSegmentedTabs renders modern Mattermost-safe section navigation.
 *
 * The component intentionally avoids Radix portals and one-off tab styling. Use
 * it for local page sections such as My Day, Team Review, Reports, and Settings
 * so navigation stays consistent across the modal.
 */
export function CampfireSegmentedTabs<TValue extends string>(props: CampfireSegmentedTabsProps<TValue>): ReactElement {
	return (
		<nav className={cn('campfire-segmented-tabs', props.className)} aria-label={props.label}>
			{props.tabs.map(tab => {
				const active = tab.value === props.activeValue;
				const helper = tab.description?.trim() ?? '';
				const Icon = tab.icon;

				return (
					<button
						key={tab.value}
						type="button"
						className={cn('campfire-segmented-tab', active && 'campfire-segmented-tab--active')}
						aria-current={active ? 'page' : undefined}
						title={helper === '' ? tab.label : `${tab.label} — ${helper}`}
						onClick={() => props.onChange(tab.value)}
					>
						{Icon !== undefined && (
							<span className="campfire-segmented-tab-icon" aria-hidden="true">
								<Icon className="cf:size-4" />
							</span>
						)}

						<span className="campfire-segmented-tab-copy">
							<span className="campfire-segmented-tab-label">{tab.label}</span>
							{helper !== '' && <span className="campfire-segmented-tab-description">{helper}</span>}
						</span>
					</button>
				);
			})}
		</nav>
	);
}
