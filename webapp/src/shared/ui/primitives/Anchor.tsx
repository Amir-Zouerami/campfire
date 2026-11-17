import { ExternalLink } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

import { safeExternalUrl } from '@/shared/lib/url';

import { Icon } from './Icon';

type AnchorProps = {
	readonly href: string;
	readonly children: ReactNode;
};

/**
 * Anchor is an external link that opens in a new tab without leaking the opener.
 * A URL that is not a web or mail link is shown as plain text instead of being made clickable.
 */
export function Anchor(props: AnchorProps): ReactElement {
	const href = safeExternalUrl(props.href);
	if (href === null) {
		return <span dir="auto">{props.children}</span>;
	}

	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className="cf:inline-flex cf:items-center cf:gap-1.5 cf:rounded-sm cf:text-[13px] cf:font-semibold cf:text-blue-ink cf:hover:underline cf:focus-visible:outline-2 cf:focus-visible:outline-offset-2 cf:focus-visible:outline-area"
		>
			{props.children}
			<Icon icon={ExternalLink} size="xs" />
		</a>
	);
}
