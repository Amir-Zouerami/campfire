import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

/**
 * DataColumn describes one table column.
 */
export type DataColumn<Row> = {
	readonly key: string;
	readonly header: string;
	readonly render: (row: Row) => ReactNode;
	readonly align?: 'start' | 'end';
	/** Fixed width such as "112px"; other columns share the remaining space. */
	readonly width?: string;
};

type DataTableProps<Row> = {
	readonly columns: readonly DataColumn<Row>[];
	readonly rows: readonly Row[];
	readonly getRowKey: (row: Row) => string;
	/** Accessible table name. */
	readonly caption: string;
};

/**
 * DataTable is a semantic, scroll-safe table for records. It is kept visually light:
 * a rule under each row and small uppercase headers.
 */
export function DataTable<Row>(props: DataTableProps<Row>): ReactElement {
	return (
		<div className="cf:overflow-x-auto">
			<table className="cf:w-full cf:border-collapse cf:text-sm">
				<caption className="cf:sr-only">{props.caption}</caption>
				<thead>
					<tr>
						{props.columns.map(column => (
							<th
								key={column.key}
								scope="col"
								style={column.width === undefined ? undefined : { width: column.width }}
								className={cn(
									'cf:border-b cf:border-line cf:px-3 cf:pb-2.5 cf:text-xs cf:font-extrabold cf:tracking-[0.09em] cf:text-muted cf:uppercase',
									column.align === 'end' ? 'cf:text-end' : 'cf:text-start',
								)}
							>
								{column.header}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{props.rows.map(row => (
						<tr key={props.getRowKey(row)}>
							{props.columns.map(column => (
								<td
									key={column.key}
									className={cn(
										'cf:border-b cf:border-line cf:px-3 cf:py-3 cf:align-middle',
										column.align === 'end' ? 'cf:text-end cf:tabular-nums' : 'cf:text-start',
									)}
								>
									{column.render(row)}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
