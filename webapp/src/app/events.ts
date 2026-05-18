import type { ReportKind } from '../types/domain';

/**
 * Browser event used to open the Campfire root shell from Mattermost UI actions.
 */
export const CAMPFIRE_OPEN_EVENT = 'campfire:open';

/**
 * Browser event used to apply one saved report filter to report cards.
 */
export const CAMPFIRE_APPLY_REPORT_FILTER_EVENT = 'campfire:apply-report-filter';

/**
 * ReportFilterApplyDetail carries a saved filter from the saved-filter card to report cards.
 */
export type ReportFilterApplyDetail = {
	readonly workspaceID: string;
	readonly reportType: ReportKind;
	readonly name: string;
	readonly filterJson: string;
};

/**
 * Dispatches an event that asks the Campfire root component to open.
 */
export function openCampfire(): void {
	window.dispatchEvent(new CustomEvent(CAMPFIRE_OPEN_EVENT));
}

/**
 * dispatchApplyReportFilter broadcasts one saved report filter to the report UI.
 */
export function dispatchApplyReportFilter(detail: ReportFilterApplyDetail): void {
	window.dispatchEvent(new CustomEvent<ReportFilterApplyDetail>(CAMPFIRE_APPLY_REPORT_FILTER_EVENT, { detail }));
}

/**
 * isReportFilterApplyEvent narrows a browser event to a saved-filter event.
 */
export function isReportFilterApplyEvent(event: Event): event is CustomEvent<ReportFilterApplyDetail> {
	if (!(event instanceof CustomEvent)) {
		return false;
	}

	return isReportFilterApplyDetail(event.detail);
}

/**
 * isReportFilterApplyDetail validates the custom-event detail object.
 */
function isReportFilterApplyDetail(value: unknown): value is ReportFilterApplyDetail {
	if (!isRecord(value)) {
		return false;
	}

	return (
		typeof value.workspaceID === 'string' &&
		isReportKind(value.reportType) &&
		typeof value.name === 'string' &&
		typeof value.filterJson === 'string'
	);
}

/**
 * isReportKind returns true for Campfire report kinds supported by saved filters.
 */
function isReportKind(value: unknown): value is ReportKind {
	switch (value) {
		case 'daily':
		case 'weekly':
		case 'blockers':
		case 'missing':
		case 'time':
			return true;

		default:
			return false;
	}
}

/**
 * isRecord narrows unknown JSON-ish values to an indexable object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
