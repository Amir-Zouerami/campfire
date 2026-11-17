import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

import { Icon } from '../primitives/Icon';
import { useShell } from './ShellContext';

type NavGroupProps = {
	readonly label: string;
	readonly icon: LucideIcon;
	/** Selects the group's accent colour (`my-day`, `team`, `reports`, `settings`). */
	readonly area: string;
	readonly open: boolean;
	readonly onToggle: () => void;
	readonly children: ReactNode;
};

/**
 * NavGroup is one expandable area of the sidebar. Only the open group lists its pages,
 * which keeps the menu short and every page one click away.
 */
export function NavGroup(props: NavGroupProps): ReactElement {
	return (
		<li data-area={props.area} className="cf:flex cf:flex-col">
			<button
				type="button"
				aria-expanded={props.open}
				onClick={props.onToggle}
				className={cn(
					'cf:m-0 cf:flex cf:h-[42px] cf:w-full cf:cursor-pointer cf:appearance-none cf:items-center cf:gap-3 cf:rounded-control cf:border-0 cf:bg-transparent cf:px-2.5 cf:text-start cf:text-sm cf:font-bold cf:text-ink cf:transition-colors cf:hover:bg-sunken',
					'cf:focus-visible:outline-2 cf:focus-visible:outline-offset-1 cf:focus-visible:outline-area',
				)}
			>
				<span className={cn('cf:grid cf:place-items-center', props.open ? 'cf:text-area' : 'cf:text-muted')}>
					<Icon icon={props.icon} size="md" />
				</span>
				<span className="cf:flex-1">{props.label}</span>
				<span className={cn('cf:text-muted cf:transition-transform', props.open && 'cf:rotate-180')}>
					<Icon icon={ChevronDown} size="sm" />
				</span>
			</button>
			{props.open && (
				<ul className="cf:m-0 cf:mt-0.5 cf:mb-2 cf:ms-5 cf:flex cf:list-none cf:flex-col cf:border-s cf:border-line cf:ps-3">
					{props.children}
				</ul>
			)}
		</li>
	);
}

type NavItemProps = {
	readonly label: string;
	readonly current: boolean;
	readonly onSelect: () => void;
	/** Count shown at the end of the row, e.g. pending approvals. */
	readonly badge?: number;
};

/**
 * NavItem is one page link inside a NavGroup.
 */
export function NavItem(props: NavItemProps): ReactElement {
	const shell = useShell();

	return (
		<li>
			<button
				type="button"
				aria-current={props.current ? 'page' : undefined}
				onClick={() => {
					props.onSelect();
					shell.closeDrawer();
				}}
				className={cn(
					'cf:m-0 cf:flex cf:h-9 cf:w-full cf:cursor-pointer cf:appearance-none cf:items-center cf:justify-between cf:gap-2 cf:rounded-lg cf:border-0 cf:bg-transparent cf:px-3 cf:text-start cf:text-[13.5px] cf:transition-colors',
					'cf:focus-visible:outline-2 cf:focus-visible:outline-offset-1 cf:focus-visible:outline-area',
					props.current ? 'cf:bg-sunken cf:font-bold cf:text-ink' : 'cf:font-medium cf:text-muted cf:hover:bg-sunken cf:hover:text-ink',
				)}
			>
				<span className="cf:truncate">{props.label}</span>
				{props.badge !== undefined && props.badge > 0 && (
					<span className="cf:grid cf:min-w-5 cf:place-items-center cf:rounded-md cf:bg-flame cf:px-1.5 cf:text-[11px] cf:font-bold cf:text-on-brand">
						{props.badge}
					</span>
				)}
			</button>
		</li>
	);
}

/**
 * NavList wraps NavGroups in the sidebar's navigation landmark.
 */
export function NavList(props: { readonly label: string; readonly children: ReactNode }): ReactElement {
	return (
		<nav aria-label={props.label}>
			<ul className="cf:m-0 cf:flex cf:list-none cf:flex-col cf:gap-0.5 cf:p-0">{props.children}</ul>
		</nav>
	);
}
