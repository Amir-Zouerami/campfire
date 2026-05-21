import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { Loader2, Search, UserRoundCheck } from 'lucide-react';

import { ApiClientError, listWorkspaceMembers } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/types/api';

import { profileLabel } from './useUserProfiles';

/**
 * WorkspaceMemberSelectProps contains member picker data.
 */
type WorkspaceMemberSelectProps = {
	readonly workspaceID: string;
	readonly value: string;
	readonly disabled: boolean;
	readonly label: string;
	readonly placeholder: string;
	readonly emptyOptionLabel?: string;
	readonly onChange: (userID: string) => void;
};

/**
 * LoadState describes the workspace member picker state.
 */
type LoadState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * WorkspaceMemberSelect renders a searchable workspace member picker.
 */
export function WorkspaceMemberSelect(props: WorkspaceMemberSelectProps): ReactElement {
	const [members, setMembers] = useState<readonly UserProfile[]>([]);
	const [query, setQuery] = useState('');
	const [loadState, setLoadState] = useState<LoadState>('idle');
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

	const selectedMember = useMemo(() => {
		return members.find(member => member.id === props.value) ?? null;
	}, [members, props.value]);

	const isBusy = props.disabled || loadState === 'loading';

	return (
		<div className="cf:grid cf:gap-3">
			<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3">
				<Label className="cf:text-xs cf:font-black cf:uppercase cf:tracking-widest cf:text-amber-200">
					{props.label}
				</Label>

				{loadState === 'loading' && (
					<span className="cf:inline-flex cf:items-center cf:gap-2 cf:text-xs cf:font-bold cf:text-slate-400">
						<Loader2 className="cf:size-3.5 cf:animate-spin" />
						Loading
					</span>
				)}
			</div>

			<div className="cf:relative">
				<Search className="cf:pointer-events-none cf:absolute cf:left-3 cf:top-1/2 cf:size-4 cf:-translate-y-1/2 cf:text-slate-500" />
				<Input
					className="cf:pl-9"
					disabled={isBusy}
					placeholder={props.placeholder}
					type="search"
					value={query}
					onChange={event => setQuery(event.currentTarget.value)}
				/>
			</div>

			<select
				className={selectClassName()}
				disabled={isBusy}
				value={props.value}
				onChange={event => props.onChange(event.currentTarget.value)}
			>
				<option value="">{props.emptyOptionLabel ?? 'No user selected'}</option>
				{filteredMembers.map(member => (
					<option key={member.id} value={member.id}>
						{profileLabel(member)}
					</option>
				))}
			</select>

			{selectedMember !== null && (
				<div className="cf:flex cf:items-center cf:gap-3 cf:rounded-2xl cf:border cf:border-emerald-300/20 cf:bg-emerald-300/10 cf:p-3">
					<div className="cf:grid cf:size-9 cf:place-items-center cf:rounded-xl cf:bg-emerald-300/10 cf:text-emerald-100">
						<UserRoundCheck className="cf:size-4" />
					</div>

					<div className="cf:min-w-0">
						<p className="cf:truncate cf:text-sm cf:font-black cf:text-emerald-50">
							{profileLabel(selectedMember)}
						</p>
						<p className="cf:truncate cf:text-xs cf:font-bold cf:text-emerald-100/70">
							{selectedMember.id}
						</p>
					</div>

					<Button
						className="cf:ml-auto"
						type="button"
						variant="secondary"
						size="sm"
						disabled={props.disabled}
						onClick={() => props.onChange('')}
					>
						Clear
					</Button>
				</div>
			)}

			{message !== '' && <MessageRow state={loadState} message={message} />}
		</div>
	);
}

/**
 * MessageRow renders picker feedback.
 */
function MessageRow(props: { readonly state: LoadState; readonly message: string }): ReactElement {
	const isError = props.state === 'error';

	return (
		<p
			className={
				isError
					? 'cf:m-0 cf:rounded-2xl cf:border cf:border-red-300/25 cf:bg-red-950/30 cf:px-3 cf:py-2 cf:text-xs cf:font-black cf:text-red-100'
					: 'cf:m-0 cf:rounded-2xl cf:border cf:border-amber-300/25 cf:bg-amber-950/30 cf:px-3 cf:py-2 cf:text-xs cf:font-black cf:text-amber-100'
			}
		>
			{props.message}
		</p>
	);
}

/**
 * memberSearchText returns searchable member text.
 */
function memberSearchText(member: UserProfile): string {
	return [member.id, member.username, member.displayName, member.email].join(' ').toLowerCase();
}

/**
 * selectClassName returns the shared native select style.
 */
function selectClassName(): string {
	return cn(
		'cf:h-10 cf:w-full cf:rounded-md cf:border cf:border-input cf:bg-background cf:px-3 cf:py-2 cf:text-sm cf:text-foreground cf:outline-none',
		'cf:focus-visible:border-ring cf:focus-visible:ring-ring/50 cf:focus-visible:ring-3',
		'cf:disabled:cursor-not-allowed cf:disabled:opacity-50',
	);
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
