import type { ReactElement } from 'react';
import { Bookmark, Filter, ListChecks } from 'lucide-react';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireMetric,
	CampfirePanel,
	CampfireStatusPill,
} from '@/app/campfire-ui';
import type { ReportKind } from '@/types/domain';

import { formatReportKind } from './saved-filters.helpers';

/**
 * SavedFiltersHeroProps contains saved-filter summary state.
 */
type SavedFiltersHeroProps = {
	readonly selectedReportType: ReportKind;
	readonly filterCount: number;
	readonly isBusy: boolean;
};

/**
 * SavedFiltersHero renders the saved filters page header.
 */
export function SavedFiltersHero(props: SavedFiltersHeroProps): ReactElement {
	return (
		<CampfirePanel>
			<CampfireCardHeader
				eyebrow="Saved filters"
				title="Reusable report views"
				description="Save common report filters and apply them to report pages without rebuilding the same view each time."
				icon={Bookmark}
				action={<CampfireStatusPill tone="ember">Workspace filters</CampfireStatusPill>}
			/>

			<CampfireCardBody className="campfire-context-grid">
				<CampfireMetric
					label="Selected type"
					value={formatReportKind(props.selectedReportType)}
					helper="Currently listed"
					icon={Filter}
				/>
				<CampfireMetric
					label="Filters"
					value={String(props.filterCount)}
					helper="Owned by current user"
					icon={ListChecks}
				/>
				<CampfireMetric
					label="Status"
					value={props.isBusy ? 'Updating' : 'Ready'}
					helper="Create / apply / delete"
				/>
			</CampfireCardBody>
		</CampfirePanel>
	);
}
