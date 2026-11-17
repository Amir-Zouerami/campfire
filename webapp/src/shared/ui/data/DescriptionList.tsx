import type { ReactElement, ReactNode } from 'react';

/**
 * DescriptionItem is one term/detail pair.
 */
export type DescriptionItem = {
	readonly term: string;
	readonly detail: ReactNode;
};

type DescriptionListProps = {
	readonly items: readonly DescriptionItem[];
};

/**
 * DescriptionList shows labelled facts in a ruled two-column list (leave details, audit entries).
 */
export function DescriptionList(props: DescriptionListProps): ReactElement {
	return (
		<dl className="cf:m-0 cf:grid cf:grid-cols-[minmax(112px,160px)_1fr] cf:border-t cf:border-line">
			{props.items.map(item => (
				<div key={item.term} className="cf:col-span-2 cf:grid cf:grid-cols-subgrid cf:border-b cf:border-line cf:py-2.5">
					<dt className="cf:m-0 cf:text-sm cf:text-muted">{item.term}</dt>
					<dd className="cf:m-0 cf:min-w-0 cf:text-sm cf:font-semibold cf:text-ink">{item.detail}</dd>
				</div>
			))}
		</dl>
	);
}
