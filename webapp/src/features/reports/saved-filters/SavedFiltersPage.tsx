import type { ReactElement } from 'react';

import { CampfireCardBody, CampfirePanel } from '@/app/campfire-ui';
import type { Workspace } from '@/types/domain';

import { SavedFilterCreatePanel } from './SavedFilterCreatePanel';
import { SavedFilterListPanel } from './SavedFilterListPanel';
import { SavedFiltersFeedback, SavedFiltersLoading } from './SavedFiltersFeedback';
import { SavedFiltersHero } from './SavedFiltersHero';
import { useSavedFilters } from './useSavedFilters';

/**
 * SavedFiltersPageProps contains workspace context.
 */
type SavedFiltersPageProps = {
	readonly workspace: Workspace;
};

/**
 * SavedFiltersPage renders the rewritten report saved-filter workspace.
 */
export function SavedFiltersPage(props: SavedFiltersPageProps): ReactElement {
	const savedFilters = useSavedFilters({
		workspace: props.workspace,
	});

	return (
		<div className="cf:grid cf:gap-5">
			<SavedFiltersHero
				selectedReportType={savedFilters.selectedReportType}
				filterCount={savedFilters.sortedFilters.length}
				isBusy={savedFilters.isBusy}
			/>

			<CampfirePanel>
				<CampfireCardBody className="cf:grid cf:gap-5">
					<SavedFiltersFeedback state={savedFilters.loadState} message={savedFilters.message} />

					{savedFilters.loadState === 'loading' && <SavedFiltersLoading />}

					<div className="cf:grid cf:gap-5 cf:xl:grid-cols-[0.9fr_1.1fr]">
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
				</CampfireCardBody>
			</CampfirePanel>
		</div>
	);
}
