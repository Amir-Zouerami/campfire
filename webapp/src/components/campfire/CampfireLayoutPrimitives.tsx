import type { LucideIcon } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

/**
 * CampfireSurfaceProps contains shared surface layout props for the flatter UI pass.
 */
type CampfireSurfaceProps = {
	readonly children: ReactNode;
	readonly className?: string;
};

/**
 * CampfireDividerProps contains a flat visual separator.
 */
type CampfireDividerProps = {
	readonly label?: string;
	readonly className?: string;
};

/**
 * CampfireKbdProps contains one keyboard hint.
 */
type CampfireKbdProps = {
	readonly children: ReactNode;
	readonly className?: string;
};

/**
 * CampfireVisuallyHiddenProps contains screen-reader-only content.
 */
type CampfireVisuallyHiddenProps = {
	readonly children: ReactNode;
	readonly className?: string;
};

/**
 * CampfireEmptyStateProps contains calm empty/restricted-state content.
 */
type CampfireEmptyStateProps = {
	readonly icon: LucideIcon;
	readonly title: string;
	readonly description: string;
	readonly action?: ReactNode;
	readonly className?: string;
};

/**
 * CampfireEmptyProps contains compatibility empty-state content for older
 * feature panels that are being migrated to the flatter workflow primitives.
 */
type CampfireEmptyProps = {
	readonly icon?: LucideIcon;
	readonly title: string;
	readonly description: string;
	readonly action?: ReactNode;
	readonly className?: string;
};

/**
 * CampfireStatusTone controls compact pill tone styling.
 */
type CampfireStatusTone = 'slate' | 'ember' | 'green' | 'red' | 'blue';

/**
 * CampfireStatusPillProps contains compact status pill content.
 */
type CampfireStatusPillProps = {
	readonly children: ReactNode;
	readonly tone?: CampfireStatusTone;
	readonly className?: string;
};

/**
 * CampfireFieldErrorProps contains a compact inline validation message.
 */
type CampfireFieldErrorProps = {
	readonly message?: string;
	readonly id?: string;
};

/**
 * CampfirePageHeaderProps contains one page heading and optional actions.
 */
type CampfirePageHeaderProps = {
	readonly eyebrow?: string;
	readonly title: string;
	readonly description: string;
	readonly actions?: ReactNode;
	readonly className?: string;
};

/**
 * CampfireWorkflowIntroProps contains the shared hero/control surface used at
 * the top of focused workflows.
 */
type CampfireWorkflowIntroProps = {
	readonly eyebrow: string;
	readonly title: string;
	readonly description: string;
	readonly controls?: ReactNode;
	readonly children?: ReactNode;
	readonly className?: string;
	readonly id?: string;
};

/**
 * CampfireStatCardProps contains compact dashboard stat content.
 */
type CampfireStatCardProps = {
	readonly icon: LucideIcon;
	readonly label: string;
	readonly value: string;
	readonly helper?: string;
	readonly tone?: 'ember' | 'green' | 'red' | 'blue' | 'slate';
};

/**
 * CampfireQuickLinkProps contains one action row that opens a focused page.
 */
type CampfireQuickLinkProps = {
	readonly icon: LucideIcon;
	readonly label: string;
	readonly description: string;
	readonly onClick: () => void;
};

/**
 * CampfireWorkflowNoteProps contains compact explanatory copy for workflow behavior.
 */
type CampfireWorkflowNoteProps = {
	readonly icon: LucideIcon;
	readonly title: string;
	readonly description: string;
	readonly children?: ReactNode;
	readonly className?: string;
};

/**
 * CampfirePillTab defines one flat pill-tab item.
 */
export type CampfirePillTab<TValue extends string> = {
	readonly value: TValue;
	readonly label: string;
};

/**
 * CampfireSectionTab defines one reusable section tab with optional helper text.
 */
export type CampfireSectionTab<TValue extends string> = CampfirePillTab<TValue> & {
	readonly description?: string;
};

/**
 * CampfirePillTabsProps contains controlled pill-tab navigation.
 */
type CampfirePillTabsProps<TValue extends string> = {
	readonly tabs: readonly CampfirePillTab<TValue>[];
	readonly activeValue: TValue;
	readonly label: string;
	readonly onChange: (value: TValue) => void;
};

/**
 * CampfireSectionTabsProps contains reusable section navigation tabs.
 */
type CampfireSectionTabsProps<TValue extends string> = {
	readonly tabs: readonly CampfireSectionTab<TValue>[];
	readonly activeValue: TValue;
	readonly label: string;
	readonly onChange: (value: TValue) => void;
	readonly className?: string;
};

/**
 * CampfireSurface renders a flatter matte surface for the new app layout.
 */
export function CampfireSurface(props: CampfireSurfaceProps): ReactElement {
	return <section className={cn('campfire-surface', props.className)}>{props.children}</section>;
}

/**
 * CampfireDivider renders a quiet separator for dense workflows without adding
 * another nested card or panel.
 */
export function CampfireDivider(props: CampfireDividerProps): ReactElement {
	const label = props.label?.trim() ?? '';

	if (label === '') {
		return <hr className={cn('campfire-divider', props.className)} />;
	}

	return (
		<div className={cn('campfire-divider campfire-divider--labeled', props.className)} role="separator">
			<span>{label}</span>
		</div>
	);
}

/**
 * CampfireKbd renders a small keyboard affordance with the matte Campfire tone.
 */
export function CampfireKbd(props: CampfireKbdProps): ReactElement {
	return <kbd className={cn('campfire-kbd', props.className)}>{props.children}</kbd>;
}

/**
 * CampfireVisuallyHidden keeps accessible labels available without adding
 * visible text to the compact Mattermost plugin chrome.
 */
export function CampfireVisuallyHidden(props: CampfireVisuallyHiddenProps): ReactElement {
	return <span className={cn('campfire-visually-hidden', props.className)}>{props.children}</span>;
}

/**
 * CampfireEmptyState renders permission, empty, and setup states without using
 * the older nested card surface primitives.
 */
export function CampfireEmptyState(props: CampfireEmptyStateProps): ReactElement {
	const Icon = props.icon;

	return (
		<div className={cn('campfire-empty-state', props.className)}>
			<span className="campfire-empty-state-icon" aria-hidden="true">
				<Icon className="cf:size-6" />
			</span>
			<div className="campfire-empty-state-copy">
				<h3>{props.title}</h3>
				<p>{props.description}</p>
				{props.action !== undefined && <div className="campfire-empty-state-action">{props.action}</div>}
			</div>
		</div>
	);
}

/**
 * CampfireEmpty renders the flatter empty state while keeping the older feature
 * API stable during the remaining UI cleanup passes.
 */
export function CampfireEmpty(props: CampfireEmptyProps): ReactElement {
	const Icon = props.icon;

	return (
		<div className={cn('campfire-empty-state', Icon === undefined && 'campfire-empty-state--plain', props.className)}>
			{Icon !== undefined && (
				<span className="campfire-empty-state-icon" aria-hidden="true">
					<Icon className="cf:size-6" />
				</span>
			)}
			<div className="campfire-empty-state-copy">
				<h3>{props.title}</h3>
				<p>{props.description}</p>
				{props.action !== undefined && <div className="campfire-empty-state-action">{props.action}</div>}
			</div>
		</div>
	);
}

/**
 * CampfireStatusPill renders one compact, matte status label across all pages.
 */
export function CampfireStatusPill(props: CampfireStatusPillProps): ReactElement {
	return (
		<span className={cn('campfire-status-pill', statusToneClassName(props.tone ?? 'slate'), props.className)}>
			{props.children}
		</span>
	);
}

/**
 * CampfireFieldError renders a local form validation message without using
 * global API error chrome or shifting full-page layout.
 */
export function CampfireFieldError(props: CampfireFieldErrorProps): ReactElement | null {
	const message = props.message?.trim() ?? '';

	if (message === '') {
		return null;
	}

	return (
		<span id={props.id} className="campfire-field-error" role="alert">
			{message}
		</span>
	);
}

/**
 * CampfirePageHeader renders the single title area used by each focused page.
 */
export function CampfirePageHeader(props: CampfirePageHeaderProps): ReactElement {
	return (
		<header className={cn('campfire-page-header', props.className)}>
			<div className="cf:min-w-0">
				{props.eyebrow !== undefined && props.eyebrow.trim() !== '' && (
					<p className="campfire-page-eyebrow">{props.eyebrow}</p>
				)}
				<h2 className="campfire-page-title">{props.title}</h2>
				<p className="campfire-page-description">{props.description}</p>
			</div>

			{props.actions !== undefined && <div className="campfire-page-actions">{props.actions}</div>}
		</header>
	);
}

/**
 * CampfireWorkflowIntro renders the shared warm workflow intro/control surface.
 *
 * Use this for focused workflow cards such as review cockpit, report controls,
 * and settings intros so spacing, typography, and color stay identical.
 */
export function CampfireWorkflowIntro(props: CampfireWorkflowIntroProps): ReactElement {
	const titleID = props.id ?? `campfire-workflow-intro-${props.eyebrow.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

	return (
		<section className={cn('campfire-workflow-intro', props.className)} aria-labelledby={titleID}>
			<div className="campfire-workflow-intro-row">
				<div className="campfire-workflow-intro-copy">
					<p className="campfire-workflow-intro-eyebrow">{props.eyebrow}</p>
					<h3 id={titleID}>{props.title}</h3>
					<p>{props.description}</p>
				</div>

				{props.controls !== undefined && (
					<div className="campfire-workflow-intro-controls">{props.controls}</div>
				)}
			</div>

			{props.children !== undefined && <div className="campfire-workflow-intro-body">{props.children}</div>}
		</section>
	);
}

/**
 * CampfireStatCard renders a compact metric without heavy nested dashboard chrome.
 */
export function CampfireStatCard(props: CampfireStatCardProps): ReactElement {
	const Icon = props.icon;
	const tone = props.tone ?? 'ember';

	return (
		<div className={cn('campfire-stat-card', `campfire-stat-card--${tone}`)}>
			<span className="campfire-stat-icon" aria-hidden="true">
				<Icon className="cf:size-5" />
			</span>
			<span className="campfire-stat-copy">
				<span className="campfire-stat-label">{props.label}</span>
				<span className="campfire-stat-value">{props.value}</span>
				{props.helper !== undefined && props.helper.trim() !== '' && (
					<span className="campfire-stat-helper">{props.helper}</span>
				)}
			</span>
		</div>
	);
}

/**
 * CampfireQuickLink renders one matte row that opens a dedicated workflow page.
 */
export function CampfireQuickLink(props: CampfireQuickLinkProps): ReactElement {
	const Icon = props.icon;

	return (
		<button type="button" className="campfire-quick-link" onClick={props.onClick}>
			<span className="campfire-quick-link-icon" aria-hidden="true">
				<Icon className="cf:size-5" />
			</span>
			<span className="campfire-quick-link-copy">
				<span className="campfire-quick-link-label">{props.label}</span>
				<span className="campfire-quick-link-description">{props.description}</span>
			</span>
			<span className="campfire-quick-link-arrow" aria-hidden="true">
				→
			</span>
		</button>
	);
}

/**
 * CampfireWorkflowNote renders a small, flat information strip without creating
 * another nested card layer. Use it for behavior explanations that should not
 * become form errors or alert banners.
 */
export function CampfireWorkflowNote(props: CampfireWorkflowNoteProps): ReactElement {
	const Icon = props.icon;

	return (
		<div className={cn('campfire-workflow-note', props.className)}>
			<span className="campfire-workflow-note-icon" aria-hidden="true">
				<Icon className="cf:size-4" />
			</span>
			<span className="campfire-workflow-note-copy">
				<strong>{props.title}</strong>
				<span>{props.description}</span>
				{props.children}
			</span>
		</div>
	);
}

/**
 * CampfirePillTabs renders the consistent matte/gradient tab pattern.
 */
export function CampfirePillTabs<TValue extends string>(props: CampfirePillTabsProps<TValue>): ReactElement {
	return (
		<nav className="campfire-pill-tabs" aria-label={props.label}>
			{props.tabs.map(tab => {
				const active = tab.value === props.activeValue;

				return (
					<button
						key={tab.value}
						type="button"
						className={cn('campfire-pill-tab', active && 'campfire-pill-tab--active')}
						aria-current={active ? 'page' : undefined}
						onClick={() => props.onChange(tab.value)}
					>
						{tab.label}
					</button>
				);
			})}
		</nav>
	);
}

/**
 * CampfireSectionTabs renders reusable section navigation for feature sub-pages.
 *
 * It intentionally keeps the visible UI to one calm pill row. Descriptions are
 * retained as title text for accessibility without reintroducing card-like tabs.
 */
export function CampfireSectionTabs<TValue extends string>(props: CampfireSectionTabsProps<TValue>): ReactElement {
	return (
		<nav className={cn('campfire-section-tabs', props.className)} aria-label={props.label}>
			{props.tabs.map(tab => {
				const active = tab.value === props.activeValue;
				const helper = tab.description?.trim() ?? '';

				return (
					<button
						key={tab.value}
						type="button"
						className={cn('campfire-section-tab', active && 'campfire-section-tab--active')}
						aria-current={active ? 'page' : undefined}
						title={helper === '' ? tab.label : `${tab.label} — ${helper}`}
						onClick={() => props.onChange(tab.value)}
					>
						{tab.label}
					</button>
				);
			})}
		</nav>
	);
}

/**
 * CampfireBackButton renders a quiet back affordance inside focused sub-pages.
 */
export function CampfireBackButton(props: { readonly children: ReactNode; readonly onClick: () => void }): ReactElement {
	const { direction } = useI18n();
	const arrow = direction === 'rtl' ? '→' : '←';

	return (
		<button type="button" className="campfire-back-button" onClick={props.onClick}>
			{arrow} {props.children}
		</button>
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
