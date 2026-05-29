import type { ReactElement } from 'react';
import { Download, FileDown, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { csvExportActions, exportActionCardClassName } from './csv-exports.helpers';
import type { CSVExportKind } from './csv-exports.types';
import { CampfireStatusPill } from '@/components/campfire/CampfireLayoutPrimitives';

/**
 * CSVExportActionsPanelProps contains export actions and state.
 */
type CSVExportActionsPanelProps = {
	readonly disabled: boolean;
	readonly activeExportKind: CSVExportKind | null;
	readonly onExport: (kind: CSVExportKind) => Promise<void>;
};

/**
 * CSVExportActionsPanel renders downloadable CSV actions with clear vertical separation.
 */
export function CSVExportActionsPanel(props: CSVExportActionsPanelProps): ReactElement {
	return (
		<section className="campfire-csv-action-list">
			{csvExportActions.map(action => {
				const active = props.activeExportKind === action.kind;

				return (
					<article key={action.kind} className={exportActionCardClassName(active)}>
						<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-4">
							<div className="cf:min-w-0 cf:flex-1">
								<p className="cf:m-0 campfire-page-eyebrow">
									{action.includesSortMode ? 'Standup export' : 'Data export'}
								</p>
								<h3 className="campfire-surface-title">
									{action.title}
								</h3>
								<p className="campfire-surface-description">
									{action.description}
								</p>
							</div>

							<div className="cf:flex cf:shrink-0 cf:flex-col cf:items-end cf:gap-3">
								<CampfireStatusPill tone={action.includesSortMode ? 'ember' : 'green'}>
									{action.includesSortMode ? 'Uses sort' : 'Date range'}
								</CampfireStatusPill>

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
						</div>
					</article>
				);
			})}
		</section>
	);
}