import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';

import { IconButton } from '../primitives/IconButton';
import { BrandMark } from './BrandMark';
import { ShellContext } from './ShellContext';

type AppShellProps = {
	/** Sidebar body: workspace header, navigation and the user footer. */
	readonly sidebar: ReactNode;
	/** Top-right window actions (refresh, close). */
	readonly actions: ReactNode;
	/** Accent area applied to the content (`my-day`, `team`, `reports`, `settings`). */
	readonly area: string;
	readonly children: ReactNode;
};

/**
 * AppShell is the two-column application frame: a persistent sidebar beside the page.
 * On narrow windows the sidebar becomes a drawer opened from a menu button.
 */
export function AppShell(props: AppShellProps): ReactElement {
	const { t } = useI18n();
	const [drawerOpen, setDrawerOpen] = useState(false);

	return (
		<div className="cf:flex cf:h-full cf:min-h-0 cf:w-full">
			<aside
				className={cn(
					'cf:flex cf:w-[264px] cf:shrink-0 cf:flex-col cf:gap-5 cf:overflow-y-auto cf:border-e cf:border-line cf:bg-surface cf:p-4',
					'cf:max-md:absolute cf:max-md:inset-y-0 cf:max-md:start-0 cf:max-md:z-20 cf:max-md:shadow-modal',
					drawerOpen ? 'cf:max-md:flex' : 'cf:max-md:hidden',
				)}
			>
				<div className="cf:flex cf:items-center cf:justify-between cf:px-2">
					<BrandMark />
					<span className="cf:md:hidden">
						<IconButton icon={X} label={t('common.close')} variant="ghost" size="sm" onClick={() => setDrawerOpen(false)} />
					</span>
				</div>
				<ShellContext value={{ closeDrawer: () => setDrawerOpen(false) }}>
					<div className="cf:flex cf:min-h-0 cf:flex-1 cf:flex-col cf:gap-5">{props.sidebar}</div>
				</ShellContext>
			</aside>
			<div data-area={props.area} className="cf:flex cf:min-w-0 cf:flex-1 cf:flex-col">
				<div className="cf:flex cf:items-center cf:justify-between cf:gap-3 cf:px-6 cf:pt-5 cf:pb-1 cf:md:px-12">
					<span className="cf:md:hidden">
						<IconButton icon={Menu} label={t('shared.nav.menu')} onClick={() => setDrawerOpen(true)} />
					</span>
					<span className="cf:ms-auto cf:flex cf:items-center cf:gap-2">{props.actions}</span>
				</div>
				<main className="cf:min-h-0 cf:flex-1 cf:overflow-y-auto cf:px-6 cf:pt-3 cf:pb-12 cf:md:px-12">{props.children}</main>
			</div>
		</div>
	);
}
