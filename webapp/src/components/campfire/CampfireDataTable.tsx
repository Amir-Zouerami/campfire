import type { CSSProperties, ReactElement, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * CampfireDataTableProps contains the shell for readable Campfire data lists.
 */
export type CampfireDataTableProps = {
	readonly label: string;
	readonly columns: readonly string[];
	readonly children: ReactNode;
	readonly empty?: ReactNode;
	readonly footer?: ReactNode;
	readonly className?: string;
	readonly columnsTemplate?: string;
};

/**
 * CampfireDataTableRowProps contains one row of data cells.
 */
export type CampfireDataTableRowProps = {
	readonly children: ReactNode;
	readonly className?: string;
};

/**
 * CampfireDataTableCellProps contains one readable cell.
 */
export type CampfireDataTableCellProps = {
	readonly children: ReactNode;
	readonly className?: string;
};

/**
 * CampfireDataTable renders accessible table-like rows with consistent spacing.
 */
export function CampfireDataTable(props: CampfireDataTableProps): ReactElement {
	const style = props.columnsTemplate === undefined
		? undefined
		: ({ '--campfire-data-table-columns': props.columnsTemplate } as CSSProperties);

	return (
		<>
			<div className={cn('campfire-data-table campfire-data-table--readable', props.className)} role="table" aria-label={props.label} style={style}>
				<div className="campfire-data-table-row campfire-data-table-row--head" role="row">
					{props.columns.map(column => (
						<span key={column} className="campfire-data-table-header-cell" role="columnheader">{column}</span>
					))}
				</div>

				{props.children}

				{props.empty !== undefined && <div className="campfire-data-table-empty">{props.empty}</div>}
			</div>

			{props.footer !== undefined && <p className="campfire-table-footer">{props.footer}</p>}
		</>
	);
}

/**
 * CampfireDataTableRow renders one readable row in a Campfire data table.
 */
export function CampfireDataTableRow(props: CampfireDataTableRowProps): ReactElement {
	return <div className={cn('campfire-data-table-row', props.className)} role="row">{props.children}</div>;
}

/**
 * CampfireDataTableCell renders one readable data-table cell.
 */
export function CampfireDataTableCell(props: CampfireDataTableCellProps): ReactElement {
	return <span className={cn('campfire-data-table-cell', props.className)} role="cell">{props.children}</span>;
}
