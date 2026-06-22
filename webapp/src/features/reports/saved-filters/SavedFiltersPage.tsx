import type { ReactElement } from 'react';

import { CampfirePageIntro } from '@/components/campfire/CampfirePageIntro';
import { CampfireReportSummaryBar } from '@/components/campfire/CampfireReportSummaryBar';
import { useI18n } from '@/i18n';
import type { Workspace } from '@/types/domain';

import { SavedFilterCreatePanel } from './SavedFilterCreatePanel';
import { SavedFilterListPanel } from './SavedFilterListPanel';
import { SavedFiltersFeedback, SavedFiltersLoading } from './SavedFiltersFeedback';
import { savedFilterReportKindLabel } from './saved-filters.i18n';
import { useSavedFilters } from './useSavedFilters';

/**
 * SavedFiltersPageProps contains workspace context.
 */
type SavedFiltersPageProps = {
	readonly workspace: Workspace;
};

/**
 * SavedFiltersPage renders reusable report-view filters.
 */
export function SavedFiltersPage(props: SavedFiltersPageProps): ReactElement {
	const { t } = useI18n();
	const savedFilters = useSavedFilters({
		workspace: props.workspace,
	});

	return (
		<div className="campfire-page-stack campfire-report-page-stack">
			<CampfirePageIntro
				eyebrow={t('reports.saved.page.eyebrow')}
				title={t('reports.saved.page.title')}
				description={t('reports.saved.page.description')}
			/>

			<SavedFiltersFeedback state={savedFilters.loadState} message={savedFilters.message} />
			{savedFilters.loadState === 'loading' && <SavedFiltersLoading />}

			<CampfireReportSummaryBar
				items={[
					{ label: t('reports.saved.summary.savedFilters'), value: String(savedFilters.sortedFilters.length), tone: 'neutral' },
					{
						label: t('reports.saved.summary.visibleLibrary'),
						value: savedFilterReportKindLabel(savedFilters.selectedReportType, t),
						tone: 'neutral',
					},
					{
						label: t('reports.saved.summary.state'),
						value: savedFilters.isBusy ? t('common.working') : t('common.ready'),
						tone: savedFilters.isBusy ? 'warning' : 'success',
					},
				]}
			/>

			<div className="campfire-report-saved-filter-layout">
				<SavedFilterCreatePanel
					draft={savedFilters.draft}
					disabled={savedFilters.isBusy}
					onChange={savedFilters.updateDraft}
					onCreate={savedFilters.createFilter}
				/>

				<SavedFilterListPanel
					selectedReportType={savedFilters.selectedReportType}
					filters={savedFilters.sortedFilters}
					disabled={savedFilters.isBusy}
					onReportTypeChange={savedFilters.setSelectedReportType}
					onApply={savedFilters.applyFilter}
					onDelete={savedFilters.deleteFilter}
				/>
			</div>
		</div>
	);
}
