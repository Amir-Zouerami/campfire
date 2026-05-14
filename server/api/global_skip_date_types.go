package api

import "github.com/amir-zouerami/campfire/server/domain"

/*
GlobalSkipDatePayload is the API representation of a global Campfire off-day.
*/
type GlobalSkipDatePayload struct {
	ID        string `json:"id"`
	Date      string `json:"date"`
	Label     string `json:"label"`
	CreatedBy string `json:"createdBy"`
	CreatedAt string `json:"createdAt"`
}

/*
ListGlobalSkipDatesResponse is returned by GET /settings/global/skip-dates.
*/
type ListGlobalSkipDatesResponse struct {
	SkipDates []GlobalSkipDatePayload `json:"skipDates"`
}

/*
CreateGlobalSkipDateRequest is accepted by POST /settings/global/skip-dates.
*/
type CreateGlobalSkipDateRequest struct {
	Date  string `json:"date"`
	Label string `json:"label"`
}

/*
CreateGlobalSkipDateResponse is returned by POST /settings/global/skip-dates.
*/
type CreateGlobalSkipDateResponse struct {
	SkipDate GlobalSkipDatePayload `json:"skipDate"`
}

/*
DeleteGlobalSkipDateResponse is returned by DELETE /settings/global/skip-dates/{skipDateID}.
*/
type DeleteGlobalSkipDateResponse struct {
	Deleted bool `json:"deleted"`
}

/*
GlobalSkipDateToPayload maps a domain global skip date to its API representation.
*/
func GlobalSkipDateToPayload(skipDate domain.GlobalSkipDate) GlobalSkipDatePayload {
	return GlobalSkipDatePayload{
		ID:        skipDate.ID.String(),
		Date:      skipDate.Date.String(),
		Label:     skipDate.Label,
		CreatedBy: skipDate.CreatedBy,
		CreatedAt: formatAPITime(skipDate.CreatedAt),
	}
}

/*
GlobalSkipDatesToPayload maps domain global skip dates to API payloads.
*/
func GlobalSkipDatesToPayload(skipDates []domain.GlobalSkipDate) []GlobalSkipDatePayload {
	payloads := make([]GlobalSkipDatePayload, 0, len(skipDates))

	for _, skipDate := range skipDates {
		payloads = append(payloads, GlobalSkipDateToPayload(skipDate))
	}

	return payloads
}
