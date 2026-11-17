import type { ReactElement, ReactNode } from 'react';

import { Avatar } from '../primitives/Avatar';
import { Text } from '../layout/Text';

type SidebarWorkspaceProps = {
	readonly name: string;
	readonly subtitle: string;
	/** An extra line such as the related-link anchor. */
	readonly children?: ReactNode;
};

/**
 * SidebarWorkspace names the current workspace at the top of the sidebar.
 */
export function SidebarWorkspace(props: SidebarWorkspaceProps): ReactElement {
	return (
		<div className="cf:flex cf:flex-col cf:gap-1 cf:border-b cf:border-line cf:px-2 cf:pb-4">
			<Text weight="bold" userContent truncate>
				{props.name}
			</Text>
			<Text size="sm" tone="muted">
				{props.subtitle}
			</Text>
			{props.children}
		</div>
	);
}

type SidebarUserProps = {
	readonly name: string;
	readonly userID: string;
	/** The user's role in the workspace. */
	readonly role: string;
	/** Per-user controls, laid out in one row: the language picker and the theme toggle. */
	readonly children?: ReactNode;
};

/**
 * SidebarUser shows the signed-in person at the bottom of the sidebar.
 */
export function SidebarUser(props: SidebarUserProps): ReactElement {
	return (
		<div className="cf:mt-auto cf:flex cf:flex-col cf:gap-3 cf:border-t cf:border-line cf:px-2 cf:pt-4">
			<span className="cf:flex cf:items-center cf:gap-3">
				<Avatar name={props.name} userID={props.userID} size="md" />
				<span className="cf:flex cf:min-w-0 cf:flex-col">
					<Text weight="bold" truncate userContent>
						{props.name}
					</Text>
					<Text size="sm" tone="muted" truncate>
						{props.role}
					</Text>
				</span>
			</span>
			{props.children !== undefined && <div className="cf:flex cf:items-center cf:gap-2">{props.children}</div>}
		</div>
	);
}
