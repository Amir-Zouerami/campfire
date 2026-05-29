import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { Loader2, Search, UserRoundCheck } from 'lucide-react';

import { ApiClientError, listWorkspaceMembers } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { UserProfile } from '@/types/api';

/**
 * CampfireUserPickerProps contains a workspace member search picker.
 */
type CampfireUserPickerProps = {
	readonly workspaceID: string;
	readonly value: string;
	readonly disabled?: boolean;
	readonly placeholder?: string;
	readonly onChange: (userID: string) => void;
};

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * CampfireUserPicker lets admins search readable Mattermost profiles instead
 * of pasting opaque Mattermost user IDs into role forms.
 */
export function CampfireUserPicker(props: CampfireUserPickerProps): ReactElement {
	const [members, setMembers] = useState<readonly UserProfile[]>([]);
	const [query, setQuery] = useState('');
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [message, setMessage] = useState('');

	useEffect(() => {
		let active = true;

		async function loadMembers(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const response = await listWorkspaceMembers(props.workspaceID);
				if (!active) {
					return;
				}

				setMembers(response.users);
				setLoadState('ready');
			} catch (error: unknown) {
				if (!active) {
					return;
				}

				setLoadState('error');
				setMessage(errorToMessage(error));
			}
		}

		void loadMembers();

		return () => {
			active = false;
		};
	}, [props.workspaceID]);

	const selectedUser = useMemo(() => members.find(member => member.id === props.value) ?? null, [members, props.value]);
	const visibleMembers = useMemo(() => filterMembers(members, query).slice(0, 8), [members, query]);
	const disabled = props.disabled === true || loadState === 'loading';

	return (
		<div className="campfire-user-picker">
			<label className="campfire-user-picker-search">
				<Search className="cf:size-4" aria-hidden="true" />
				<Input
					type="search"
					disabled={disabled}
					placeholder={props.placeholder ?? 'Search by username, display name, or email'}
					value={query}
					onChange={event => setQuery(event.currentTarget.value)}
				/>
				{loadState === 'loading' && <Loader2 className="cf:size-4 cf:animate-spin" aria-hidden="true" />}
			</label>

			{selectedUser !== null && (
				<div className="campfire-user-picker-selected">
					<UserRoundCheck className="cf:size-4" aria-hidden="true" />
					<span>
						<strong>{profileLabel(selectedUser)}</strong>
						<small>{selectedUser.username.trim() === '' ? selectedUser.id : `@${selectedUser.username}`}</small>
					</span>
					<Button type="button" variant="secondary" size="sm" disabled={props.disabled} onClick={() => props.onChange('')}>
						Clear
					</Button>
				</div>
			)}

			{query.trim() !== '' && selectedUser === null && visibleMembers.length > 0 && (
				<div className="campfire-user-picker-results" role="listbox" aria-label="Matching workspace members">
					{visibleMembers.map(member => (
						<button key={member.id} type="button" disabled={disabled} onClick={() => props.onChange(member.id)}>
							<span>{profileLabel(member)}</span>
							<small>{member.username.trim() === '' ? member.email : `@${member.username}`}</small>
						</button>
					))}
				</div>
			)}

			{query.trim() !== '' && loadState === 'ready' && selectedUser === null && visibleMembers.length === 0 && (
				<p className="campfire-user-picker-message">No matching channel members.</p>
			)}

			{message !== '' && <p className="campfire-user-picker-message campfire-user-picker-message--error">{message}</p>}
		</div>
	);
}

/**
 * profileLabel returns the best readable label for one Mattermost user.
 */
function profileLabel(profile: UserProfile): string {
	const displayName = profile.displayName.trim();
	if (displayName !== '') {
		return displayName;
	}

	const username = profile.username.trim();
	if (username !== '') {
		return `@${username}`;
	}

	return profile.id;
}

/**
 * filterMembers searches user identity fields locally.
 */
function filterMembers(members: readonly UserProfile[], query: string): readonly UserProfile[] {
	const cleanQuery = query.trim().toLowerCase();
	if (cleanQuery === '') {
		return [];
	}

	return members.filter(member => [member.id, member.username, member.displayName, member.email].join(' ').toLowerCase().includes(cleanQuery));
}

/**
 * errorToMessage converts unknown errors to safe picker text.
 */
function errorToMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return 'Could not load workspace members.';
}
