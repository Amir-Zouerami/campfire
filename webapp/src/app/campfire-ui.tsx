import type { LucideIcon } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * CampfirePanelProps contains shared panel layout props.
 */
type CampfirePanelProps = {
	readonly children: ReactNode;
	readonly className?: string;
};

/**
 * CampfireCardBodyProps contains shared card body layout props.
 */
type CampfireCardBodyProps = {
	readonly children: ReactNode;
	readonly className?: string;
};

/**
 * CampfireCardHeaderProps contains shared card header data.
 */
type CampfireCardHeaderProps = {
	readonly eyebrow: string;
	readonly title: string;
	readonly description?: string;
	readonly icon?: LucideIcon;
	readonly action?: ReactNode;
	readonly className?: string;
};

/**
 * CampfireMetricProps contains compact metric display data.
 */
type CampfireMetricProps = {
	readonly label: string;
	readonly value: string;
	readonly helper?: string;
	readonly icon?: LucideIcon;
	readonly className?: string;
};

/**
 * CampfireEmptyProps contains empty-state display data.
 */
type CampfireEmptyProps = {
	readonly icon?: LucideIcon;
	readonly title: string;
	readonly description: string;
	readonly action?: ReactNode;
	readonly className?: string;
};

/**
 * CampfireStatusTone controls status pill color.
 */
type CampfireStatusTone = 'slate' | 'ember' | 'green' | 'red' | 'blue';

/**
 * CampfireStatusPillProps contains status pill data.
 */
type CampfireStatusPillProps = {
	readonly children: ReactNode;
	readonly tone?: CampfireStatusTone;
	readonly className?: string;
};

/**
 * CampfirePanel renders a shared warm glass card surface.
 */
export function CampfirePanel(props: CampfirePanelProps): ReactElement {
	return <section className={cn('campfire-panel', props.className)}>{props.children}</section>;
}

/**
 * CampfireCardHeader renders a shared card heading.
 */
export function CampfireCardHeader(props: CampfireCardHeaderProps): ReactElement {
	const Icon = props.icon;

	return (
		<header className={cn('campfire-card-header', props.className)}>
			<div className="cf:flex cf:min-w-0 cf:items-start cf:gap-4">
				{Icon !== undefined && (
					<div className="campfire-icon-tile campfire-icon-tile--header">
						<Icon className="cf:size-6" />
					</div>
				)}

				<div className="cf:min-w-0">
					<p className="campfire-eyebrow">{props.eyebrow}</p>
					<h2 className="campfire-title">{props.title}</h2>

					{props.description !== undefined && props.description.trim() !== '' && (
						<p className="campfire-description">{props.description}</p>
					)}
				</div>
			</div>

			{props.action !== undefined && (
				<div className="cf:flex cf:shrink-0 cf:flex-wrap cf:items-center cf:gap-2">{props.action}</div>
			)}
		</header>
	);
}

/**
 * CampfireCardBody renders shared card body spacing.
 */
export function CampfireCardBody(props: CampfireCardBodyProps): ReactElement {
	return <div className={cn('campfire-card-body', props.className)}>{props.children}</div>;
}

/**
 * CampfireMetric renders a compact metric tile.
 */
export function CampfireMetric(props: CampfireMetricProps): ReactElement {
	const Icon = props.icon;

	return (
		<div className={cn('campfire-metric', props.className)}>
			<div className="cf:flex cf:items-start cf:justify-between cf:gap-3">
				<div className="cf:min-w-0">
					<p className="campfire-metric-label">{props.label}</p>
					<p className="campfire-metric-value">{props.value}</p>
				</div>

				{Icon !== undefined && (
					<div className="campfire-icon-tile campfire-icon-tile--metric cf:size-11 cf:rounded-xl">
						<Icon className="cf:size-5" />
					</div>
				)}
			</div>

			{props.helper !== undefined && props.helper.trim() !== '' && (
				<p className="campfire-metric-helper">{props.helper}</p>
			)}
		</div>
	);
}

/**
 * CampfireEmpty renders a shared empty state.
 */
export function CampfireEmpty(props: CampfireEmptyProps): ReactElement {
	const Icon = props.icon;

	return (
		<div className={cn('campfire-empty', props.className)}>
			<div className="cf:max-w-md">
				{Icon !== undefined && (
					<div className="campfire-icon-tile campfire-icon-tile--empty cf:mx-auto cf:size-16">
						<Icon className="cf:size-7" />
					</div>
				)}

				<h3 className="cf:m-0 cf:mt-4 cf:text-xl cf:font-black cf:tracking-tight cf:text-orange-50">
					{props.title}
				</h3>

				<p className="cf:m-0 cf:mt-2 cf:text-sm cf:font-semibold cf:leading-6 cf:text-orange-100/65">
					{props.description}
				</p>

				{props.action !== undefined && <div className="cf:mt-5 cf:flex cf:justify-center">{props.action}</div>}
			</div>
		</div>
	);
}

/**
 * CampfireStatusPill renders a shared status chip.
 */
export function CampfireStatusPill(props: CampfireStatusPillProps): ReactElement {
	return (
		<span className={cn('campfire-status-pill', statusToneClassName(props.tone ?? 'slate'), props.className)}>
			{props.children}
		</span>
	);
}

/**
 * statusToneClassName returns classes for a status tone.
 */
function statusToneClassName(tone: CampfireStatusTone): string {
	switch (tone) {
		case 'ember':
			return 'campfire-status-pill--ember';

		case 'green':
			return 'campfire-status-pill--green';

		case 'red':
			return 'campfire-status-pill--red';

		case 'blue':
			return 'campfire-status-pill--blue';

		case 'slate':
			return 'campfire-status-pill--slate';
	}
}
