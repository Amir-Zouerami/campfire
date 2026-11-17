import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

import { Heading } from './Heading';
import { Inline } from './Inline';
import { Stack } from './Stack';
import { Text } from './Text';

type SectionProps = {
	/** A small uppercase label above the title. */
	readonly eyebrow?: string;
	readonly title?: string;
	readonly description?: string;
	readonly actions?: ReactNode;
	/** Draws a rule above the section and pads it, to separate stacked sections. */
	readonly divided?: boolean;
	readonly children: ReactNode;
};

/**
 * Section groups related content under a heading. Sections replace card containers:
 * structure comes from spacing and thin rules, not boxes.
 */
export function Section(props: SectionProps): ReactElement {
	const hasHeader = props.title !== undefined || props.actions !== undefined || props.eyebrow !== undefined;

	return (
		<section className={cn('cf:flex cf:min-w-0 cf:flex-col cf:gap-4', props.divided === true && 'cf:border-t cf:border-line cf:pt-7')}>
			{hasHeader && (
				<Inline justify="between" align="start" gap={4}>
					<Stack gap={1}>
						{props.eyebrow !== undefined && (
							<Text uppercase tone="muted">
								{props.eyebrow}
							</Text>
						)}
						{props.title !== undefined && <Heading level={2}>{props.title}</Heading>}
						{props.description !== undefined && (
							<Text as="p" tone="muted">
								{props.description}
							</Text>
						)}
					</Stack>
					{props.actions}
				</Inline>
			)}
			{props.children}
		</section>
	);
}
