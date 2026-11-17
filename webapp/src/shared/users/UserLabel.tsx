import type { ReactElement } from 'react';

import { useI18n } from '@/shared/i18n';
import { Avatar, Text } from '@/shared/ui';

import { useUserDirectory } from './userDirectory';

type UserLabelProps = {
	readonly userID: string;
	readonly size?: 'xs' | 'sm' | 'md' | 'lg';
	/** A second line under the name (role, time submitted). */
	readonly subtitle?: string;
};

/**
 * UserLabel shows a person: their Mattermost avatar and display name, resolved from the user ID.
 */
export function UserLabel(props: UserLabelProps): ReactElement {
	const { t } = useI18n();
	const directory = useUserDirectory([props.userID]);
	const name = directory.nameOf(props.userID, t('common.unknown'));

	return (
		<span className="cf:flex cf:min-w-0 cf:items-center cf:gap-2.5">
			<Avatar name={name} userID={props.userID} size={props.size ?? 'sm'} />
			<span className="cf:flex cf:min-w-0 cf:flex-col">
				<Text weight="semibold" truncate userContent>
					{name}
				</Text>
				{props.subtitle !== undefined && (
					<Text size="sm" tone="muted" truncate>
						{props.subtitle}
					</Text>
				)}
			</span>
		</span>
	);
}

/**
 * UserName renders just a person's display name, inline in a sentence or table cell.
 */
export function UserName(props: { readonly userID: string }): ReactElement {
	const { t } = useI18n();
	const directory = useUserDirectory([props.userID]);

	return <span dir="auto">{directory.nameOf(props.userID, t('common.unknown'))}</span>;
}
