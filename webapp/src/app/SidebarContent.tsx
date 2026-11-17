import type { ReactElement } from 'react';

import { useI18n } from '@/shared/i18n';
import { useNavigation } from '@/shared/navigation';
import type { Area } from '@/shared/navigation';
import { useWorkspaceSession } from '@/shared/session';
import { Anchor, LanguageSelect, NavGroup, NavItem, NavList, SidebarUser, SidebarWorkspace, ThemeToggle } from '@/shared/ui';

import { accessRoleKey } from './access';
import type { Access } from './access';
import { AREAS } from './pages';
import type { PageDefinition } from './pages';

type SidebarContentProps = {
	readonly pages: readonly PageDefinition[];
	readonly access: Access;
	readonly openAreas: ReadonlySet<Area>;
	readonly onToggleArea: (area: Area) => void;
};

/**
 * SidebarContent is the workspace header, the page navigation and the signed-in user.
 */
export function SidebarContent(props: SidebarContentProps): ReactElement {
	const { t } = useI18n();
	const { workspace, user } = useWorkspaceSession();
	const navigation = useNavigation();
	const userName = user.displayName.trim() !== '' ? user.displayName : user.username;
	const boardURL = workspace.boardUrl.trim();

	return (
		<>
			<SidebarWorkspace name={workspace.name} subtitle={t('workspace.sidebar.workspaceTimezone', { timezone: workspace.timezone })}>
				{boardURL !== '' && <Anchor href={boardURL}>{t('settings.overview.fact.boardUrl')}</Anchor>}
			</SidebarWorkspace>

			<NavList label={t('workspace.nav.ariaLabel')}>
				{AREAS.map(area => {
					const pages = props.pages.filter(page => page.area === area.id);
					if (pages.length === 0) {
						return null;
					}

					return (
						<NavGroup
							key={area.id}
							area={area.id}
							icon={area.icon}
							label={t(area.labelKey)}
							open={props.openAreas.has(area.id)}
							onToggle={() => props.onToggleArea(area.id)}
						>
							{pages.map(page => (
								<NavItem
									key={page.id}
									label={t(page.labelKey)}
									current={navigation.page === page.id}
									onSelect={() => navigation.navigate(page.id)}
								/>
							))}
						</NavGroup>
					);
				})}
			</NavList>

			<SidebarUser name={userName} userID={user.id} role={t(accessRoleKey(props.access))}>
				<LanguageSelect />
				<ThemeToggle size="lg" />
			</SidebarUser>
		</>
	);
}
