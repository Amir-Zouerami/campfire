import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, X } from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { useI18n } from '@/shared/i18n';
import { NavigationProvider, areaOf } from '@/shared/navigation';
import type { Area, NavigationParams, PageId } from '@/shared/navigation';
import { useWorkspaceSession } from '@/shared/session';
import { AppShell, Button, EmptyState, ErrorBoundary, IconButton, ThemeToggle } from '@/shared/ui';

import type { Access } from './access';
import { resolvePage, visiblePages } from './pages';
import { SidebarContent } from './SidebarContent';

const FIRST_PAGE: PageId = 'my-day.standup';

type WorkspaceShellProps = {
	readonly onClose: () => void;
};

/**
 * WorkspaceShell is the signed-in application: sidebar navigation plus the current page.
 */
export function WorkspaceShell(props: WorkspaceShellProps): ReactElement {
	const { t } = useI18n();
	const queryClient = useQueryClient();
	const { capabilities, isSystemAdmin } = useWorkspaceSession();
	const access: Access = { capabilities, isSystemAdmin };
	const pages = visiblePages(access);

	const [location, setLocation] = useState<{ readonly page: PageId; readonly params?: NavigationParams }>({ page: FIRST_PAGE });
	const [openAreas, setOpenAreas] = useState<ReadonlySet<Area>>(() => new Set([areaOf(FIRST_PAGE)]));

	// If permissions change (or the requested page is not allowed) fall back to a page the user can open.
	const current = resolvePage(location.page, pages);
	const Page = current.component;

	function navigate(page: PageId, params?: NavigationParams): void {
		setLocation({ page, params });
		setOpenAreas(open => new Set(open).add(areaOf(page)));
	}

	function toggleArea(area: Area): void {
		setOpenAreas(open => {
			const next = new Set(open);
			if (!next.delete(area)) {
				next.add(area);
			}

			return next;
		});
	}

	return (
		<NavigationProvider value={{ page: current.id, params: location.params, navigate }}>
			<AppShell
				area={current.area}
				sidebar={<SidebarContent pages={pages} access={access} openAreas={openAreas} onToggleArea={toggleArea} />}
				actions={
					<>
						<ThemeToggle />
						<IconButton icon={RefreshCw} label={t('common.refresh')} onClick={() => void queryClient.invalidateQueries()} />
						<IconButton icon={X} label={t('workspace.action.close')} onClick={props.onClose} />
					</>
				}
			>
				<ErrorBoundary
					key={current.id}
					fallback={(error, reset) => (
						<EmptyState
							title={t('common.loadFailed')}
							description={error.message}
							action={
								<Button variant="secondary" size="sm" onClick={reset}>
									{t('common.retry')}
								</Button>
							}
						/>
					)}
				>
					<Page />
				</ErrorBoundary>
			</AppShell>
		</NavigationProvider>
	);
}
