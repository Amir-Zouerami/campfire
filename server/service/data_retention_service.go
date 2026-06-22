package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/store"
)

/*
DataRetentionSummary describes the operational rows older than a cutoff date.
*/
type DataRetentionSummary struct {
	CutoffDate         domain.LocalDate
	StandupSubmissions int
	StandupAnswers     int
	LeaveRequests      int
	LeaveDecisions     int
	TimeEntries        int
	ReportRuns         int
	NotificationRuns   int
	AuditLogEntries    int
	TotalRows          int
}

/*
PreviewWorkspaceDataRetentionInput contains data needed for a purge preview.
*/
type PreviewWorkspaceDataRetentionInput struct {
	ActorUserID string
	WorkspaceID string
	CutoffDate  string
}

/*
PurgeWorkspaceDataRetentionInput contains data needed for an irreversible purge.
*/
type PurgeWorkspaceDataRetentionInput struct {
	ActorUserID string
	WorkspaceID string
	CutoffDate  string
}

/*
DataRetentionService owns irreversible operational-history cleanup rules.
*/
type DataRetentionService struct {
	workspaceStore     store.WorkspaceStore
	dataRetentionStore store.DataRetentionStore
}

/*
NewDataRetentionService creates a data retention service.
*/
func NewDataRetentionService(
	workspaceStore store.WorkspaceStore,
	dataRetentionStore store.DataRetentionStore,
) *DataRetentionService {
	return &DataRetentionService{
		workspaceStore:     workspaceStore,
		dataRetentionStore: dataRetentionStore,
	}
}

/*
Preview returns row counts that would be hard-deleted by the cutoff.
*/
func (s *DataRetentionService) Preview(
	ctx context.Context,
	input PreviewWorkspaceDataRetentionInput,
) (*DataRetentionSummary, error) {
	workspaceID, cutoffDate, err := s.validateInput(ctx, input.ActorUserID, input.WorkspaceID, input.CutoffDate)
	if err != nil {
		return nil, err
	}

	counts, err := s.dataRetentionStore.PreviewWorkspacePurge(ctx, workspaceID, cutoffDate.String())
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not preview old workspace data.")
	}

	return dataRetentionSummaryFromCounts(cutoffDate, *counts), nil
}

/*
Purge hard-deletes operational rows older than the cutoff date.
*/
func (s *DataRetentionService) Purge(
	ctx context.Context,
	input PurgeWorkspaceDataRetentionInput,
) (*DataRetentionSummary, error) {
	workspaceID, cutoffDate, err := s.validateInput(ctx, input.ActorUserID, input.WorkspaceID, input.CutoffDate)
	if err != nil {
		return nil, err
	}

	counts, err := s.dataRetentionStore.PurgeWorkspaceData(ctx, workspaceID, cutoffDate.String())
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not delete old workspace data.")
	}

	return dataRetentionSummaryFromCounts(cutoffDate, *counts), nil
}

/*
validateInput validates shared purge preview/delete inputs.
*/
func (s *DataRetentionService) validateInput(
	ctx context.Context,
	actorUserID string,
	workspaceIDValue string,
	cutoffDateValue string,
) (domain.ID, domain.LocalDate, error) {
	cleanActorUserID := strings.TrimSpace(actorUserID)
	if cleanActorUserID == "" {
		return "", "", NewError(ErrorCodePermissionDenied, "You must be signed in to manage workspace data.")
	}

	workspaceID := domain.ID(strings.TrimSpace(workspaceIDValue))
	if workspaceID.String() == "" {
		return "", "", NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
	}

	if _, err := s.workspaceStore.GetByID(ctx, workspaceID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return "", "", NewError(ErrorCodeNotFound, "Workspace was not found.")
		}

		return "", "", NewError(ErrorCodeInternal, "Could not load workspace.")
	}

	cutoffDate, err := parseRetentionCutoffDate(cutoffDateValue)
	if err != nil {
		return "", "", err
	}

	return workspaceID, cutoffDate, nil
}

/*
parseRetentionCutoffDate validates a YYYY-MM-DD cutoff before today.
*/
func parseRetentionCutoffDate(value string) (domain.LocalDate, error) {
	cleanValue := strings.TrimSpace(value)
	if cleanValue == "" {
		return "", NewError(ErrorCodeValidationFailed, "Cutoff date is required.")
	}

	parsedDate, err := time.Parse("2006-01-02", cleanValue)
	if err != nil {
		return "", NewError(ErrorCodeValidationFailed, "Cutoff date must use YYYY-MM-DD format.")
	}

	today := time.Now().UTC().Truncate(24 * time.Hour)
	if !parsedDate.Before(today) {
		return "", NewError(ErrorCodeValidationFailed, "Cutoff date must be before today.")
	}

	return domain.LocalDate(cleanValue), nil
}

/*
dataRetentionSummaryFromCounts maps store counts to service output.
*/
func dataRetentionSummaryFromCounts(
	cutoffDate domain.LocalDate,
	counts store.DataRetentionCounts,
) *DataRetentionSummary {
	return &DataRetentionSummary{
		CutoffDate:         cutoffDate,
		StandupSubmissions: counts.StandupSubmissions,
		StandupAnswers:     counts.StandupAnswers,
		LeaveRequests:      counts.LeaveRequests,
		LeaveDecisions:     counts.LeaveDecisions,
		TimeEntries:        counts.TimeEntries,
		ReportRuns:         counts.ReportRuns,
		NotificationRuns:   counts.NotificationRuns,
		AuditLogEntries:    counts.AuditLogEntries,
		TotalRows:          counts.Total(),
	}
}
