import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * CampfireBidiTextProps contains isolated user/content text.
 */
type CampfireBidiTextProps = {
	readonly children: ReactNode;
	readonly className?: string;
	readonly title?: string;
};

/**
 * CampfireBidiText isolates mixed Persian/English text and applies the modal
 * Persian-capable font without leaking styles into Mattermost posts.
 */
export function CampfireBidiText(props: CampfireBidiTextProps): ReactElement {
	return (
		<bdi className={cn('campfire-bidi-text', props.className)} dir="auto" title={props.title}>
			{props.children}
		</bdi>
	);
}

/**
 * CampfireEllipsisTextProps contains truncating text with a full hover title.
 */
type CampfireEllipsisTextProps = {
	readonly value: string;
	readonly className?: string;
};

/**
 * CampfireEllipsisText renders readable isolated text that reveals the full
 * value through the native hover tooltip when it is visually truncated.
 */
export function CampfireEllipsisText(props: CampfireEllipsisTextProps): ReactElement {
	const value = props.value.trim() === '' ? '—' : props.value;

	return (
		<CampfireBidiText className={cn('campfire-ellipsis-text', props.className)} title={value}>
			{value}
		</CampfireBidiText>
	);
}
