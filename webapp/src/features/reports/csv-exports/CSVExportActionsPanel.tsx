import type { ReactElement } from 'react';
import { Download, FileDown, Loader2 } from 'lucide-react';

import { CampfireStatusPill } from '@/components/campfire/CampfireLayoutPrimitives';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';

import { csvExportActions, exportActionCardClassName } from './csv-exports.helpers';
import { csvExportActionDescription, csvExportActionTitle } from './csv-exports.i18n';
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
 * CSVExportActionsPanel renders downloadable CSV actions with clear vertical separation.
 */
export function CSVExportActionsPanel(props: CSVExportActionsPanelProps): ReactElement {
	const { t } = useI18n();

	return (
		<section className="campfire-csv-action-list">
			{csvExportActions.map(action => {
				const active = props.activeExportKind === action.kind;

				return (
					<article key={action.kind} className={exportActionCardClassName(active)}>
						<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-4">
							<div className="cf:min-w-0 cf:flex-1">
								<p className="cf:m-0 campfire-page-eyebrow">
									{action.includesSortMode ? t('reports.csv.action.type.standup') : t('reports.csv.action.type.data')}
								</p>
								<h3 className="campfire-surface-title">
									{csvExportActionTitle(action.kind, t)}
								</h3>
								<p className="campfire-surface-description">
									{csvExportActionDescription(action.kind, t)}
								</p>
							</div>

							<div className="cf:flex cf:shrink-0 cf:flex-col cf:items-end cf:gap-3">
								<CampfireStatusPill tone={action.includesSortMode ? 'ember' : 'green'}>
									{action.includesSortMode ? t('reports.csv.action.badge.usesSort') : t('reports.csv.action.badge.dateRange')}
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
									{t('reports.csv.action.export')}
								</Button>
							</div>
						</div>
					</article>
				);
			})}
		</section>
	);
}
