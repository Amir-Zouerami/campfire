import { useState } from 'react';
import type { ReactElement } from 'react';

import { cn } from '@/shared/lib/cn';
import { initialsOf, stableIndex } from '@/shared/lib/initials';

const SIZE_CLASS = {
	xs: 'cf:size-6 cf:text-[10px]',
	sm: 'cf:size-8 cf:text-[11px]',
	md: 'cf:size-[38px] cf:text-xs',
	lg: 'cf:size-12 cf:text-sm',
} as const;

const TINTS = [
	'cf:bg-blue-soft cf:text-blue-ink',
	'cf:bg-violet-soft cf:text-violet-ink',
	'cf:bg-teal-soft cf:text-teal-ink',
	'cf:bg-rose-soft cf:text-rose-ink',
	'cf:bg-flame-soft cf:text-flame-ink',
] as const;

type AvatarProps = {
	readonly name: string;
	/** Mattermost user ID; when present the profile picture is loaded from Mattermost. */
	readonly userID?: string;
	readonly size?: keyof typeof SIZE_CLASS;
};

/**
 * Avatar shows a user's Mattermost profile picture, falling back to tinted initials
 * when the image is missing or still loading.
 */
export function Avatar(props: AvatarProps): ReactElement {
	const [failed, setFailed] = useState(false);
	const showImage = props.userID !== undefined && props.userID !== '' && !failed;

	return (
		<span
			role="img"
			aria-label={props.name}
			className={cn(
				'cf:inline-grid cf:shrink-0 cf:place-items-center cf:overflow-hidden cf:rounded-full cf:font-bold',
				SIZE_CLASS[props.size ?? 'md'],
				TINTS[stableIndex(props.userID ?? props.name, TINTS.length)],
			)}
		>
			{showImage ? (
				<img
					alt=""
					loading="lazy"
					className="cf:size-full cf:object-cover"
					src={profileImageURL(props.userID ?? '')}
					onError={() => setFailed(true)}
				/>
			) : (
				<span aria-hidden="true">{initialsOf(props.name)}</span>
			)}
		</span>
	);
}

/**
 * profileImageURL returns Mattermost's profile picture endpoint for a user.
 */
function profileImageURL(userID: string): string {
	const basename = typeof window.basename === 'string' ? window.basename : '';

	return `${basename}/api/v4/users/${encodeURIComponent(userID)}/image`;
}
