package api

import "github.com/amir-zouerami/campfire/server/domain"

/*
SavedReportFilterPayload is the API representation of a saved report filter.
*/
type SavedReportFilterPayload struct {
	ID          string `json:"id"`
	WorkspaceID string `json:"workspaceId"`
	UserID      string `json:"userId"`
	Name        string `json:"name"`
	Scope       string `json:"scope"`
	ReportType  string `json:"reportType"`
	FilterJSON  string `json:"filterJson"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

/*
CreateSavedReportFilterRequest is accepted by POST /workspaces/{workspaceID}/reports/saved-filters.
*/
type CreateSavedReportFilterRequest struct {
	Name       string `json:"name"`
	Scope      string `json:"scope"`
	ReportType string `json:"reportType"`
	FilterJSON string `json:"filterJson"`
}

/*
ListSavedReportFiltersResponse is returned by GET /workspaces/{workspaceID}/reports/saved-filters.
*/
type ListSavedReportFiltersResponse struct {
	Filters []SavedReportFilterPayload `json:"filters"`
}

/*
CreateSavedReportFilterResponse is returned by POST /workspaces/{workspaceID}/reports/saved-filters.
*/
type CreateSavedReportFilterResponse struct {
	Filter SavedReportFilterPayload `json:"filter"`
}

/*
DeleteSavedReportFilterResponse is returned by DELETE /workspaces/{workspaceID}/reports/saved-filters/{filterID}.
*/
type DeleteSavedReportFilterResponse struct {
	Deleted bool `json:"deleted"`
}

/*
SavedReportFiltersToPayload maps saved report filters to API payloads.
*/
func SavedReportFiltersToPayload(filters []domain.SavedReportFilter) []SavedReportFilterPayload {
	payloads := make([]SavedReportFilterPayload, 0, len(filters))

	for _, filter := range filters {
		payloads = append(payloads, SavedReportFilterToPayload(filter))
	}

	return payloads
}

/*
SavedReportFilterToPayload maps one saved report filter to API payload.
*/
func SavedReportFilterToPayload(filter domain.SavedReportFilter) SavedReportFilterPayload {
	return SavedReportFilterPayload{
		ID:          filter.ID.String(),
		WorkspaceID: filter.WorkspaceID.String(),
		UserID:      filter.UserID,
		Name:        filter.Name,
		Scope:       string(filter.Scope),
		ReportType:  string(filter.ReportType),
		FilterJSON:  filter.FilterJSON,
		CreatedAt:   formatAPITime(filter.CreatedAt),
		UpdatedAt:   formatAPITime(filter.UpdatedAt),
	}
}
