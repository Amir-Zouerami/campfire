import type {
	CreateSavedReportFilterRequest,
	CreateSavedReportFilterResponse,
	DeleteSavedReportFilterResponse,
	GetDailyReportPreviewResponse,
	GetGlobalLeaveReportSummaryResponse,
	GetGlobalTimeReportSummaryResponse,
	GetTimeReportSummaryResponse,
	GetWeeklyReportPreviewResponse,
	ListDailyReportRunsResponse,
	ListSavedReportFiltersResponse,
	PostDailyReportPreviewRequest,
	PostDailyReportPreviewResponse,
	PostWeeklyReportPreviewRequest,
	PostWeeklyReportPreviewResponse,
} from '@/types/api';
import type { ReportKind, ReportSortMode, StandupSubmissionSortMode, TimeReportGroupBy } from '@/types/domain';

import { encodePath, requestBlob, requestJson, withQuery } from './http';

/**
 * getTimeReportSummary calls GET /workspaces/{workspaceID}/reports/time-summary.
 */
export function getTimeReportSummary(
	workspaceID: string,
	startDate: string,
	endDate: string,
	groupBy: TimeReportGroupBy,
): Promise<GetTimeReportSummaryResponse> {
	return requestJson<GetTimeReportSummaryResponse>(
		withQuery(`/workspaces/${encodePath(workspaceID)}/reports/time-summary`, {
			startDate,
			endDate,
			groupBy,
		}),
	);
}

/**
 * getDailyReportPreview calls GET /workspaces/{workspaceID}/reports/daily-preview.
 */
export function getDailyReportPreview(
	workspaceID: string,
	occurrenceDate: string,
	sortMode: StandupSubmissionSortMode,
): Promise<GetDailyReportPreviewResponse> {
	return requestJson<GetDailyReportPreviewResponse>(
		withQuery(`/workspaces/${encodePath(workspaceID)}/reports/daily-preview`, {
			occurrenceDate,
			sortMode,
		}),
	);
}

/**
 * postDailyReportPreview calls POST /workspaces/{workspaceID}/reports/daily-preview/post.
 */
export function postDailyReportPreview(
	workspaceID: string,
	request: PostDailyReportPreviewRequest,
): Promise<PostDailyReportPreviewResponse> {
	return requestJson<PostDailyReportPreviewResponse>(
		`/workspaces/${encodePath(workspaceID)}/reports/daily-preview/post`,
		{
			method: 'POST',
			body: request,
		},
	);
}

/**
 * getWeeklyReportPreview calls GET /workspaces/{workspaceID}/reports/weekly-preview.
 */
export function getWeeklyReportPreview(
	workspaceID: string,
	periodStart: string,
	periodEnd: string,
	sortMode: ReportSortMode,
): Promise<GetWeeklyReportPreviewResponse> {
	return requestJson<GetWeeklyReportPreviewResponse>(
		withQuery(`/workspaces/${encodePath(workspaceID)}/reports/weekly-preview`, {
			periodStart,
			periodEnd,
			sortMode,
		}),
	);
}

/**
 * postWeeklyReportPreview calls POST /workspaces/{workspaceID}/reports/weekly-preview/post.
 */
export function postWeeklyReportPreview(
	workspaceID: string,
	request: PostWeeklyReportPreviewRequest,
): Promise<PostWeeklyReportPreviewResponse> {
	return requestJson<PostWeeklyReportPreviewResponse>(
		`/workspaces/${encodePath(workspaceID)}/reports/weekly-preview/post`,
		{
			method: 'POST',
			body: request,
		},
	);
}

/**
 * listDailyReportRuns calls GET /workspaces/{workspaceID}/reports/daily-runs.
 */
export function listDailyReportRuns(
	workspaceID: string,
	startDate: string,
	endDate: string,
): Promise<ListDailyReportRunsResponse> {
	return requestJson<ListDailyReportRunsResponse>(
		withQuery(`/workspaces/${encodePath(workspaceID)}/reports/daily-runs`, {
			startDate,
			endDate,
		}),
	);
}

/**
 * listSavedReportFilters calls GET /workspaces/{workspaceID}/reports/saved-filters.
 */
export function listSavedReportFilters(
	workspaceID: string,
	reportType: ReportKind,
): Promise<ListSavedReportFiltersResponse> {
	return requestJson<ListSavedReportFiltersResponse>(
		withQuery(`/workspaces/${encodePath(workspaceID)}/reports/saved-filters`, {
			reportType,
		}),
	);
}

/**
 * createSavedReportFilter calls POST /workspaces/{workspaceID}/reports/saved-filters.
 */
export function createSavedReportFilter(
	workspaceID: string,
	request: CreateSavedReportFilterRequest,
): Promise<CreateSavedReportFilterResponse> {
	return requestJson<CreateSavedReportFilterResponse>(
		`/workspaces/${encodePath(workspaceID)}/reports/saved-filters`,
		{
			method: 'POST',
			body: request,
		},
	);
}

/**
 * deleteSavedReportFilter calls DELETE /workspaces/{workspaceID}/reports/saved-filters/{filterID}.
 */
export function deleteSavedReportFilter(
	workspaceID: string,
	filterID: string,
): Promise<DeleteSavedReportFilterResponse> {
	return requestJson<DeleteSavedReportFilterResponse>(
		`/workspaces/${encodePath(workspaceID)}/reports/saved-filters/${encodePath(filterID)}`,
		{
			method: 'DELETE',
		},
	);
}

/**
 * getGlobalTimeReportSummary calls GET /reports/global/time-summary.
 */
export function getGlobalTimeReportSummary(
	startDate: string,
	endDate: string,
	groupBy: TimeReportGroupBy,
): Promise<GetGlobalTimeReportSummaryResponse> {
	return requestJson<GetGlobalTimeReportSummaryResponse>(
		withQuery('/reports/global/time-summary', {
			startDate,
			endDate,
			groupBy,
		}),
	);
}

/**
 * getGlobalLeaveReportSummary calls GET /reports/global/leaves.
 */
export function getGlobalLeaveReportSummary(
	startDate: string,
	endDate: string,
): Promise<GetGlobalLeaveReportSummaryResponse> {
	return requestJson<GetGlobalLeaveReportSummaryResponse>(
		withQuery('/reports/global/leaves', {
			startDate,
			endDate,
		}),
	);
}

/**
 * exportWorkspaceTimeCSV calls GET /workspaces/{workspaceID}/reports/time/export.csv.
 */
export function exportWorkspaceTimeCSV(workspaceID: string, startDate: string, endDate: string): Promise<Blob> {
	return requestBlob(
		withQuery(`/workspaces/${encodePath(workspaceID)}/reports/time/export.csv`, {
			startDate,
			endDate,
		}),
	);
}

/**
 * exportWorkspaceLeavesCSV calls GET /workspaces/{workspaceID}/reports/leaves/export.csv.
 */
export function exportWorkspaceLeavesCSV(workspaceID: string, startDate: string, endDate: string): Promise<Blob> {
	return requestBlob(
		withQuery(`/workspaces/${encodePath(workspaceID)}/reports/leaves/export.csv`, {
			startDate,
			endDate,
		}),
	);
}

/**
 * exportWorkspaceStandupSubmissionsCSV calls GET /workspaces/{workspaceID}/reports/standups/export.csv.
 */
export function exportWorkspaceStandupSubmissionsCSV(
	workspaceID: string,
	startDate: string,
	endDate: string,
	sortMode: StandupSubmissionSortMode,
): Promise<Blob> {
	return requestBlob(
		withQuery(`/workspaces/${encodePath(workspaceID)}/reports/standups/export.csv`, {
			startDate,
			endDate,
			sortMode,
		}),
	);
}

/**
 * exportWorkspaceMissingStandupsCSV calls GET /workspaces/{workspaceID}/reports/missing/export.csv.
 */
export function exportWorkspaceMissingStandupsCSV(
	workspaceID: string,
	startDate: string,
	endDate: string,
	sortMode: StandupSubmissionSortMode,
): Promise<Blob> {
	return requestBlob(
		withQuery(`/workspaces/${encodePath(workspaceID)}/reports/missing/export.csv`, {
			startDate,
			endDate,
			sortMode,
		}),
	);
}

/**
 * exportGlobalTimeReportCSV calls GET /reports/global/time/export.csv.
 */
export function exportGlobalTimeReportCSV(
	startDate: string,
	endDate: string,
	groupBy: TimeReportGroupBy,
): Promise<Blob> {
	return requestBlob(
		withQuery('/reports/global/time/export.csv', {
			startDate,
			endDate,
			groupBy,
		}),
	);
}

/**
 * exportGlobalLeaveReportCSV calls GET /reports/global/leaves/export.csv.
 */
export function exportGlobalLeaveReportCSV(startDate: string, endDate: string): Promise<Blob> {
	return requestBlob(
		withQuery('/reports/global/leaves/export.csv', {
			startDate,
			endDate,
		}),
	);
}
