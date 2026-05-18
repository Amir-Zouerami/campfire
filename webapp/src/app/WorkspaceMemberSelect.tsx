import { useEffect, useMemo, useState, type ReactElement } from 'react';

import { ApiClientError, listWorkspaceMembers } from '../api/client';
import type { UserProfile } from '../types/api';

/**
 * WorkspaceMemberSelectProps contains member picker data.
 */
type WorkspaceMemberSelectProps = {
	readonly workspaceID: string;
	readonly value: string;
	readonly disabled: boolean;
	readonly label: string;
	readonly placeholder: string;
	readonly onChange: (userID: string) => void;
};

/**
 * WorkspaceMemberSelect renders a searchable workspace member picker.
 */
export function WorkspaceMemberSelect(props: WorkspaceMemberSelectProps): ReactElement {
	const [members, setMembers] = useState<readonly UserProfile[]>([]);
	const [query, setQuery] = useState('');
	const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
	const [message, setMessage] = useState('');

	useEffect(() => {
		let isActive = true;

		/**
		 * Loads workspace channel members.
		 */
		async function loadMembers(): Promise<void> {
			setLoadState('loading');
			setMessage('');

			try {
				const response = await listWorkspaceMembers(props.workspaceID);

				if (!isActive) {
					return;
				}

				setMembers(response.users);
				setLoadState('ready');
			} catch (error: unknown) {
				if (!isActive) {
					return;
				}

				setMessage(errorToMessage(error));
				setLoadState('error');
			}
		}

		void loadMembers();

		return () => {
			isActive = false;
		};
	}, [props.workspaceID]);

	const filteredMembers = useMemo(() => {
		const cleanQuery = query.trim().toLowerCase();

		if (cleanQuery === '') {
			return members;
		}

		return members.filter(member => memberSearchText(member).includes(cleanQuery));
	}, [members, query]);

	const selectedMember = useMemo(
		() => members.find(member => member.id === props.value) ?? null,
		[members, props.value],
	);

	return (
		<div className="cf:grid cf:gap-2">
			<span className="cf:text-sm cf:font-black cf:text-slate-200">{props.label}</span>

			<input
				className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:placeholder:text-slate-500 cf:focus:border-emerald-300/45"
				disabled={props.disabled || loadState === 'loading'}
				placeholder={props.placeholder}
				type="search"
				value={query}
				onChange={event => setQuery(event.currentTarget.value)}
			/>

			<select
				className="cf:w-full cf:rounded-2xl cf:border cf:border-white/10 cf:bg-slate-950/60 cf:px-4 cf:py-3 cf:text-white cf:outline-none cf:focus:border-emerald-300/45"
				disabled={props.disabled || loadState === 'loading'}
				value={props.value}
				onChange={event => props.onChange(event.currentTarget.value)}
			>
				<option value="">No backup selected</option>
				{filteredMembers.map(member => (
					<option key={member.id} value={member.id}>
						{profileLabel(member)}
					</option>
				))}
			</select>

			{selectedMember !== null && (
				<p className="cf:m-0 cf:text-xs cf:font-bold cf:text-emerald-100">
					Selected backup: {profileLabel(selectedMember)}
				</p>
			)}

			{loadState === 'loading' && (
				<p className="cf:m-0 cf:text-xs cf:font-bold cf:text-slate-400">Loading workspace members…</p>
			)}

			{message !== '' && <p className="cf:m-0 cf:text-xs cf:font-bold cf:text-amber-300">{message}</p>}
		</div>
	);
}

/**
 * memberSearchText builds a searchable member string.
 */
function memberSearchText(member: UserProfile): string {
	return `${member.displayName} ${member.username} ${member.email} ${member.id}`.toLowerCase();
}

/**
 * profileLabel returns the best display label for one member.
 */
function profileLabel(member: UserProfile): string {
	if (member.displayName.trim() !== '') {
		return member.displayName;
	}

	if (member.username.trim() !== '') {
		return `@${member.username}`;
	}

	return member.id;
}

/**
 * errorToMessage converts unknown thrown values into a safe UI message.
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
