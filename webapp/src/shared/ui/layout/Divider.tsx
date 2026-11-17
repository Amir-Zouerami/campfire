import type { ReactElement } from 'react';

/**
 * Divider is a one-pixel horizontal rule.
 */
export function Divider(): ReactElement {
	return <hr className="cf:m-0 cf:h-px cf:w-full cf:border-0 cf:bg-line" />;
}
