import type { ReactElement, ReactNode } from 'react';

import { Heading } from './Heading';
import { Inline } from './Inline';
import { Stack } from './Stack';
import { Text } from './Text';

type PageHeaderProps = {
	/** Small area-coloured label above the title, e.g. the section name. */
	readonly eyebrow?: string;
	readonly title: string;
	readonly description?: string;
	/** Page-level actions aligned opposite the title. */
	readonly actions?: ReactNode;
};

/**
 * PageHeader introduces a page: eyebrow, title, description and optional actions.
 */
export function PageHeader(props: PageHeaderProps): ReactElement {
	return (
		<Inline justify="between" align="end" gap={6}>
			<Stack gap={1}>
				{props.eyebrow !== undefined && (
					<Text uppercase tone="area">
						{props.eyebrow}
					</Text>
				)}
				<Heading level={1}>{props.title}</Heading>
				{props.description !== undefined && (
					<div className="cf:max-w-2xl">
						<Text as="p" tone="muted">
							{props.description}
						</Text>
					</div>
				)}
			</Stack>
			{props.actions}
		</Inline>
	);
}
