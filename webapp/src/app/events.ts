/**
 * CAMPFIRE_OPEN_EVENT is dispatched when Mattermost plugin controls should open the modal.
 */
export const CAMPFIRE_OPEN_EVENT = 'campfire:open';

/**
 * CAMPFIRE_CLOSE_EVENT is dispatched when Campfire should close.
 */
export const CAMPFIRE_CLOSE_EVENT = 'campfire:close';

/**
 * CAMPFIRE_TOGGLE_EVENT is dispatched when Campfire should toggle.
 */
export const CAMPFIRE_TOGGLE_EVENT = 'campfire:toggle';

/**
 * CAMPFIRE_APPLY_REPORT_FILTER_EVENT is dispatched when a saved report filter is applied.
 */
export const CAMPFIRE_APPLY_REPORT_FILTER_EVENT = 'campfire:apply-report-filter';

/**
 * CampfireOpenDetail contains optional target routing data for the Campfire modal.
 */
export type CampfireOpenDetail = {
	readonly channelID?: string;
	readonly targetTab?: string;
	readonly targetSection?: string;
};

/**
 * CampfireApplyReportFilterDetail contains data needed to apply a saved report filter.
 */
export type CampfireApplyReportFilterDetail = {
	readonly workspaceID: string;
	readonly reportType: string;
	readonly name: string;
	readonly filterJson: string;
};

/**
 * openCampfire opens the Campfire modal.
 */
export function openCampfire(detail: CampfireOpenDetail = {}): void {
	window.dispatchEvent(
		new CustomEvent<CampfireOpenDetail>(CAMPFIRE_OPEN_EVENT, {
			detail,
		}),
	);
}

/**
 * closeCampfire closes the Campfire modal.
 */
export function closeCampfire(): void {
	window.dispatchEvent(new CustomEvent(CAMPFIRE_CLOSE_EVENT));
}

/**
 * toggleCampfire toggles the Campfire modal.
 */
export function toggleCampfire(): void {
	window.dispatchEvent(new CustomEvent(CAMPFIRE_TOGGLE_EVENT));
}

/**
 * dispatchApplyReportFilter broadcasts a saved report filter to report cards.
 */
export function dispatchApplyReportFilter(detail: CampfireApplyReportFilterDetail): void {
	window.dispatchEvent(
		new CustomEvent<CampfireApplyReportFilterDetail>(CAMPFIRE_APPLY_REPORT_FILTER_EVENT, {
			detail,
		}),
	);
}

/**
 * isCampfireOpenEvent narrows DOM events to Campfire open events.
 */
export function isCampfireOpenEvent(event: Event): event is CustomEvent<CampfireOpenDetail> {
	return event instanceof CustomEvent && event.type === CAMPFIRE_OPEN_EVENT && isOpenDetail(event.detail);
}

/**
 * isReportFilterApplyEvent narrows DOM events to saved-report-filter apply events.
 */
export function isReportFilterApplyEvent(event: Event): event is CustomEvent<CampfireApplyReportFilterDetail> {
	return (
		event instanceof CustomEvent &&
		event.type === CAMPFIRE_APPLY_REPORT_FILTER_EVENT &&
		isReportFilterDetail(event.detail)
	);
}

/**
 * isOpenDetail validates optional modal open detail data.
 */
function isOpenDetail(value: unknown): value is CampfireOpenDetail {
	if (!isRecord(value)) {
		return false;
	}

	return (
		isOptionalString(value.channelID) && isOptionalString(value.targetTab) && isOptionalString(value.targetSection)
	);
}

/**
 * isReportFilterDetail validates saved-report-filter event detail data.
 */
function isReportFilterDetail(value: unknown): value is CampfireApplyReportFilterDetail {
	if (!isRecord(value)) {
		return false;
	}

	return (
		typeof value.workspaceID === 'string' &&
		typeof value.reportType === 'string' &&
		typeof value.name === 'string' &&
		typeof value.filterJson === 'string'
	);
}

/**
 * isOptionalString returns true for undefined or string values.
 */
function isOptionalString(value: unknown): boolean {
	return value === undefined || typeof value === 'string';
}

/**
 * isRecord narrows unknown values to string-keyed records.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
