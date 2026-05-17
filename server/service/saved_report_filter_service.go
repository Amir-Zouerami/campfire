package service

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/store"
	"github.com/google/uuid"
)

/*
ListSavedReportFiltersInput contains saved-filter list filters.
*/
type ListSavedReportFiltersInput struct {
	ActorUserID string
	WorkspaceID string
	ReportType  string
}

/*
CreateSavedReportFilterInput contains user-submitted saved-filter data.
*/
type CreateSavedReportFilterInput struct {
	ActorUserID string
	WorkspaceID string
	Name        string
	Scope       string
	ReportType  string
	FilterJSON  string
}

/*
DeleteSavedReportFilterInput identifies one saved filter to delete.
*/
type DeleteSavedReportFilterInput struct {
	ActorUserID string
	WorkspaceID string
	FilterID    string
}

/*
SavedReportFilterService manages user-owned saved report filters.
*/
type SavedReportFilterService struct {
	workspaceStore store.WorkspaceStore
	filterStore    store.SavedReportFilterStore
}

/*
NewSavedReportFilterService creates a saved report filter service.
*/
func NewSavedReportFilterService(
	workspaceStore store.WorkspaceStore,
	filterStore store.SavedReportFilterStore,
) *SavedReportFilterService {
	return &SavedReportFilterService{
		workspaceStore: workspaceStore,
		filterStore:    filterStore,
	}
}

/*
List returns saved report filters owned by the current user.
*/
func (s *SavedReportFilterService) List(
	ctx context.Context,
	input ListSavedReportFiltersInput,
) ([]domain.SavedReportFilter, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to view saved report filters.")
	}

	workspaceID, err := s.requireWorkspace(ctx, input.WorkspaceID)
	if err != nil {
		return nil, err
	}

	reportType := domain.ReportKind(strings.TrimSpace(input.ReportType))
	if reportType != "" && !isSupportedSavedFilterReportType(reportType) {
		return nil, NewError(ErrorCodeValidationFailed, "Saved filter report type is not supported.")
	}

	filters, err := s.filterStore.ListByWorkspaceIDAndUserID(ctx, workspaceID, cleanActorUserID, reportType)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load saved report filters.")
	}

	return filters, nil
}

/*
Create saves one report filter for the current user.
*/
func (s *SavedReportFilterService) Create(
	ctx context.Context,
	input CreateSavedReportFilterInput,
) (*domain.SavedReportFilter, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to create saved report filters.")
	}

	workspaceID, err := s.requireWorkspace(ctx, input.WorkspaceID)
	if err != nil {
		return nil, err
	}

	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Saved filter name is required.")
	}

	if len(name) > 255 {
		return nil, NewError(ErrorCodeValidationFailed, "Saved filter name must be 255 characters or less.")
	}

	scope := domain.SavedReportFilterScope(strings.TrimSpace(input.Scope))
	if scope == "" {
		scope = domain.SavedReportFilterScopeWorkspace
	}

	if !scope.IsValid() {
		return nil, NewError(ErrorCodeValidationFailed, "Saved filter scope is not supported.")
	}

	reportType := domain.ReportKind(strings.TrimSpace(input.ReportType))
	if !isSupportedSavedFilterReportType(reportType) {
		return nil, NewError(ErrorCodeValidationFailed, "Saved filter report type is not supported.")
	}

	filterJSON := strings.TrimSpace(input.FilterJSON)
	if filterJSON == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Saved filter JSON is required.")
	}

	if !json.Valid([]byte(filterJSON)) {
		return nil, NewError(ErrorCodeValidationFailed, "Saved filter JSON must be valid JSON.")
	}

	now := time.Now().UTC()
	filter := domain.SavedReportFilter{
		ID:          domain.ID(uuid.NewString()),
		WorkspaceID: workspaceID,
		UserID:      cleanActorUserID,
		Name:        name,
		Scope:       scope,
		ReportType:  reportType,
		FilterJSON:  filterJSON,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	created, err := s.filterStore.Create(ctx, filter)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not create saved report filter.")
	}

	return created, nil
}

/*
Delete removes one saved report filter owned by the current user.
*/
func (s *SavedReportFilterService) Delete(
	ctx context.Context,
	input DeleteSavedReportFilterInput,
) error {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return NewError(ErrorCodePermissionDenied, "You must be signed in to delete saved report filters.")
	}

	workspaceID, err := s.requireWorkspace(ctx, input.WorkspaceID)
	if err != nil {
		return err
	}

	filterID := domain.ID(strings.TrimSpace(input.FilterID))
	if filterID.String() == "" {
		return NewError(ErrorCodeValidationFailed, "Saved filter ID is required.")
	}

	err = s.filterStore.Delete(ctx, workspaceID, cleanActorUserID, filterID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return NewError(ErrorCodeNotFound, "Saved report filter was not found.")
		}

		return NewError(ErrorCodeInternal, "Could not delete saved report filter.")
	}

	return nil
}

/*
requireWorkspace validates the workspace exists and returns its ID.
*/
func (s *SavedReportFilterService) requireWorkspace(ctx context.Context, workspaceID string) (domain.ID, error) {
	cleanWorkspaceID := strings.TrimSpace(workspaceID)
	if cleanWorkspaceID == "" {
		return "", NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
	}

	id := domain.ID(cleanWorkspaceID)
	if _, err := s.workspaceStore.GetByID(ctx, id); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return "", NewError(ErrorCodeNotFound, "Workspace was not found.")
		}

		return "", NewError(ErrorCodeInternal, "Could not load workspace.")
	}

	return id, nil
}

/*
isSupportedSavedFilterReportType returns true when a report type can be saved.
*/
func isSupportedSavedFilterReportType(reportType domain.ReportKind) bool {
	switch reportType {
	case domain.ReportKindDaily,
		domain.ReportKindWeekly,
		domain.ReportKindBlockers,
		domain.ReportKindMissing,
		domain.ReportKindTime:
		return true
	default:
		return false
	}
}
