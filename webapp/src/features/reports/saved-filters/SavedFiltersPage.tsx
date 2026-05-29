import type { ReactElement } from 'react';
import { Bookmark, Filter, Save, SlidersHorizontal } from 'lucide-react';

import { CampfireStatCard, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';
import type { Workspace } from '@/types/domain';

import { SavedFilterCreatePanel } from './SavedFilterCreatePanel';
import { SavedFilterListPanel } from './SavedFilterListPanel';
import { SavedFiltersFeedback, SavedFiltersLoading } from './SavedFiltersFeedback';
import { formatReportKind } from './saved-filters.helpers';
import { useSavedFilters } from './useSavedFilters';

/**
 * SavedFiltersPageProps contains workspace context.
 */
type SavedFiltersPageProps = {
	readonly workspace: Workspace;
};

/**
 * SavedFiltersPage renders the report saved-filter workspace.
 */
export function SavedFiltersPage(props: SavedFiltersPageProps): ReactElement {
	const savedFilters = useSavedFilters({
		workspace: props.workspace,
	});

	return (
		<div className="campfire-page-stack">
			<div className="campfire-stat-grid campfire-stat-grid--three">
				<CampfireStatCard
					icon={Bookmark}
					label="Saved filters"
					value={String(savedFilters.sortedFilters.length)}
					helper="Current report type"
				/>
				<CampfireStatCard
					icon={Filter}
					label="Report type"
					value={formatReportKind(savedFilters.selectedReportType)}
					helper="Visible library"
					tone="blue"
				/>
				<CampfireStatCard
					icon={SlidersHorizontal}
					label="State"
					value={savedFilters.isBusy ? 'Working' : 'Ready'}
					helper="Filter actions"
					tone={savedFilters.isBusy ? 'ember' : 'green'}
				/>
			</div>

			<CampfireSurface className="campfire-control-surface">
				<header className="campfire-flat-section-header">
					<div>
						<p className="campfire-page-eyebrow">Saved filters</p>
						<h3 className="campfire-surface-title">Reusable report views</h3>
						<p className="campfire-surface-description">
							Create, apply, and delete saved filters without leaving the report workspace.
						</p>
					</div>
					<Save className="campfire-flat-header-icon" aria-hidden="true" />
				</header>

				<SavedFiltersFeedback state={savedFilters.loadState} message={savedFilters.message} />
				{savedFilters.loadState === 'loading' && <SavedFiltersLoading />}
			</CampfireSurface>

			<div className="campfire-focused-split campfire-focused-split--saved-filters">
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
