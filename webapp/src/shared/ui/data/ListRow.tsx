import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

import { Text } from '../layout/Text';

type ListRowProps = {
	/** Avatar, icon or checkbox shown before the text. */
	readonly leading?: ReactNode;
	readonly title: ReactNode;
	readonly subtitle?: ReactNode;
	/** A secondary description line (notes, previews). */
	readonly detail?: ReactNode;
	/** Content aligned to the end: status, duration, actions. */
	readonly trailing?: ReactNode;
	/** Makes the whole row a button, used for master/detail lists. */
	readonly onSelect?: () => void;
	readonly selected?: boolean;
};

/**
 * ListRow is one row of a ruled list. Lists replace card grids: rows are separated by
 * thin rules and align their trailing content in a column.
 */
export function ListRow(props: ListRowProps): ReactElement {
	const body = (
		<>
			{props.leading !== undefined && <span className="cf:shrink-0">{props.leading}</span>}
			<span className="cf:flex cf:min-w-0 cf:flex-1 cf:flex-col cf:gap-0.5">
				<Text as="div" weight="bold" truncate>
					{props.title}
				</Text>
				{props.subtitle !== undefined && (
					<Text as="div" size="sm" tone="muted" truncate>
						{props.subtitle}
					</Text>
				)}
				{props.detail !== undefined && (
					<Text as="div" size="md" preserveLines>
						{props.detail}
					</Text>
				)}
			</span>
			{props.trailing !== undefined && <span className="cf:flex cf:shrink-0 cf:items-center cf:gap-3">{props.trailing}</span>}
		</>
	);

	if (props.onSelect !== undefined) {
		return (
			<li className="cf:border-b cf:border-line">
				<button
					type="button"
					aria-current={props.selected === true ? 'true' : undefined}
					onClick={props.onSelect}
					className={cn(
						'cf:m-0 cf:flex cf:w-full cf:cursor-pointer cf:appearance-none cf:items-center cf:gap-3.5 cf:rounded-control cf:border-0 cf:bg-transparent cf:px-2.5 cf:py-3 cf:text-start cf:transition-colors',
						'cf:focus-visible:outline-2 cf:focus-visible:outline-offset-1 cf:focus-visible:outline-area',
						props.selected === true ? 'cf:bg-area-soft' : 'cf:hover:bg-sunken',
					)}
				>
					{body}
				</button>
			</li>
		);
	}

	return <li className="cf:flex cf:items-center cf:gap-3.5 cf:border-b cf:border-line cf:py-3.5">{body}</li>;
}

/**
 * ListRows is the ruled list container for ListRow items.
 */
export function ListRows(props: { readonly children: ReactNode; readonly label?: string }): ReactElement {
	return (
		<ul aria-label={props.label} className="cf:m-0 cf:flex cf:list-none cf:flex-col cf:border-t cf:border-line cf:p-0">
			{props.children}
		</ul>
	);
}
