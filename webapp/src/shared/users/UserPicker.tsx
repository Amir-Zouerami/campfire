import type { ReactElement } from 'react';

import { useI18n } from '@/shared/i18n';
import { Combobox, MultiCombobox } from '@/shared/ui';
import type { ComboboxOption } from '@/shared/ui';
import type { UserProfile } from '@/shared/types/api';

import { displayNameOf, useWorkspaceMembers } from './userDirectory';

/**
 * toOption converts a member profile into a combobox option with an avatar.
 */
function toOption(user: UserProfile): ComboboxOption {
	return {
		value: user.id,
		label: displayNameOf(user),
		description: user.username === '' ? user.email : `@${user.username}`,
		avatarUserID: user.id,
	};
}

type UserPickerProps = {
	readonly value: string;
	readonly onChange: (userID: string) => void;
	readonly placeholder?: string;
	readonly disabled?: boolean;
	readonly clearable?: boolean;
	readonly label?: string;
	readonly onBlur?: () => void;
};

/**
 * UserPicker chooses one workspace member, searchable by name, username or email.
 */
export function UserPicker(props: UserPickerProps): ReactElement {
	const { t } = useI18n();
	const { members, isLoading, isError } = useWorkspaceMembers();

	return (
		<Combobox
			value={props.value}
			onChange={props.onChange}
			options={members.map(toOption)}
			placeholder={props.placeholder ?? t('shared.userPicker.placeholder')}
			emptyText={isError ? t('shared.userPicker.loadError') : t('shared.userPicker.noResults')}
			loading={isLoading}
			disabled={props.disabled}
			clearable={props.clearable}
			label={props.label ?? t('shared.userPicker.placeholder')}
			onBlur={props.onBlur}
		/>
	);
}

type UserMultiPickerProps = {
	readonly value: readonly string[];
	readonly onChange: (userIDs: readonly string[]) => void;
	readonly placeholder?: string;
	readonly disabled?: boolean;
	readonly label?: string;
};

/**
 * UserMultiPicker chooses several workspace members and shows them as removable chips.
 */
export function UserMultiPicker(props: UserMultiPickerProps): ReactElement {
	const { t } = useI18n();
	const { members, isLoading, isError } = useWorkspaceMembers();

	return (
		<MultiCombobox
			value={props.value}
			onChange={props.onChange}
			options={members.map(toOption)}
			placeholder={props.placeholder ?? t('shared.userMultiPicker.addRecipient')}
			emptyText={isError ? t('shared.userPicker.loadError') : t('shared.userPicker.noResults')}
			loading={isLoading}
			disabled={props.disabled}
			label={props.label ?? t('shared.userMultiPicker.addRecipient')}
		/>
	);
}
