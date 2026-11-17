import type { TFunction } from '@/shared/i18n';
import type { ReportSortMode } from '@/shared/types/domain';

const SORT_KEYS = {
	name: 'reports.preview.sort.name',
	first_submitted: 'reports.preview.sort.firstSubmitted',
	last_submitted: 'reports.preview.sort.lastSubmitted',
	missing_first: 'reports.preview.sort.missingFirst',
	blockers_first: 'reports.preview.sort.blockersFirst',
} as const satisfies Record<ReportSortMode, string>;

/**
 * reportSortOptions lists the report sort orders as select options. Daily reports and CSV
 * exports have no "blockers first" order, so they pass `withBlockers: false`.
 */
export function reportSortOptions(
	t: TFunction,
	withBlockers: boolean,
): readonly { readonly value: ReportSortMode; readonly label: string }[] {
	return (Object.keys(SORT_KEYS) as ReportSortMode[])
		.filter(mode => withBlockers || mode !== 'blockers_first')
		.map(mode => ({ value: mode, label: t(SORT_KEYS[mode]) }));
}
