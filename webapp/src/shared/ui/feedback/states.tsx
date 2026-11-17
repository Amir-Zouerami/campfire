import { CircleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

import { Heading } from '../layout/Heading';
import { Text } from '../layout/Text';
import { Icon } from '../primitives/Icon';
import { Spinner } from '../primitives/Spinner';

type StateProps = {
	readonly title: string;
	readonly description?: string;
	readonly action?: ReactNode;
};

/**
 * LoadingState fills a region while its data loads.
 */
export function LoadingState(props: Pick<StateProps, 'title' | 'description'>): ReactElement {
	return (
		<div className="cf:flex cf:flex-col cf:items-center cf:gap-3 cf:px-6 cf:py-14 cf:text-center">
			<Spinner size="lg" label={props.title} />
			<Text weight="bold">{props.title}</Text>
			{props.description !== undefined && (
				<Text size="sm" tone="muted">
					{props.description}
				</Text>
			)}
		</div>
	);
}

/**
 * EmptyState explains why a region has nothing to show and, optionally, what to do next.
 */
export function EmptyState(props: StateProps & { readonly icon?: LucideIcon }): ReactElement {
	return (
		<div className="cf:flex cf:flex-col cf:items-center cf:gap-3 cf:px-6 cf:py-14 cf:text-center">
			<span className="cf:grid cf:size-12 cf:place-items-center cf:rounded-full cf:bg-sunken cf:text-muted">
				<Icon icon={props.icon ?? CircleAlert} size="lg" />
			</span>
			<Heading level={3}>{props.title}</Heading>
			{props.description !== undefined && (
				<div className="cf:max-w-md">
					<Text as="p" tone="muted">
						{props.description}
					</Text>
				</div>
			)}
			{props.action}
		</div>
	);
}
