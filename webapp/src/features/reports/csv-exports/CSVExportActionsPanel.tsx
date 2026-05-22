import type { ReactElement } from 'react';
import { Download, FileDown, Loader2 } from 'lucide-react';

import { CampfireStatusPill } from '@/app/campfire-ui';
import { Button } from '@/components/ui/button';

import { csvExportActions, exportActionCardClassName } from './csv-exports.helpers';
import type { CSVExportKind } from './csv-exports.types';

/**
 * CSVExportActionsPanelProps contains export actions and state.
 */
type CSVExportActionsPanelProps = {
	readonly disabled: boolean;
	readonly activeExportKind: CSVExportKind | null;
	readonly onExport: (kind: CSVExportKind) => Promise<void>;
};

/**
 * CSVExportActionsPanel renders downloadable CSV action cards.
 */
export function CSVExportActionsPanel(props: CSVExportActionsPanelProps): ReactElement {
	return (
		<section className="cf:grid cf:gap-4 cf:xl:grid-cols-2">
			{csvExportActions.map(action => {
				const active = props.activeExportKind === action.kind;

				return (
					<article key={action.kind} className={exportActionCardClassName(active)}>
						<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-3">
							<div className="cf:min-w-0">
								<p className="cf:text-sm cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
									{action.includesSortMode ? 'Standup export' : 'Data export'}
								</p>
								<h3 className="cf:mt-1 cf:text-xl cf:font-black cf:tracking-[-0.03em] cf:text-foreground">
									{action.title}
								</h3>
							</div>

							<CampfireStatusPill tone={action.includesSortMode ? 'ember' : 'green'}>
								{action.includesSortMode ? 'Uses sort' : 'Date range'}
							</CampfireStatusPill>
						</div>

						<p className="cf:text-sm cf:font-semibold cf:leading-7 cf:text-muted-foreground">
							{action.description}
						</p>

						<div className="cf:flex cf:justify-end">
							<Button
								type="button"
								disabled={props.disabled}
								onClick={() => void props.onExport(action.kind)}
							>
								{active ? (
									<Loader2 className="cf:size-4 cf:animate-spin" />
								) : action.includesSortMode ? (
									<FileDown className="cf:size-4" />
								) : (
									<Download className="cf:size-4" />
								)}
								Export CSV
							</Button>
						</div>
					</article>
				);
			})}
		</section>
	);
}
