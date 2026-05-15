package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/store"
	"github.com/google/uuid"
)

/*
ListWorkspaceOffDaysInput contains filters for listing workspace off-days.
*/
type ListWorkspaceOffDaysInput struct {
	ActorUserID string
	WorkspaceID string
}

/*
CreateWorkspaceOffDayInput contains user-submitted workspace off-day data.
*/
type CreateWorkspaceOffDayInput struct {
	ActorUserID   string
	IsSystemAdmin bool
	WorkspaceID   string
	Date          string
	Label         string
}

/*
DeleteWorkspaceOffDayInput contains data needed to remove a workspace off-day.
*/
type DeleteWorkspaceOffDayInput struct {
	ActorUserID   string
	IsSystemAdmin bool
	WorkspaceID   string
	OffDayID      string
}

/*
WorkspaceCalendarService owns workspace working-calendar business rules.
*/
type WorkspaceCalendarService struct {
	workspaceStore         store.WorkspaceStore
	workspaceCalendarStore store.WorkspaceCalendarStore
	workspaceRoleStore     store.WorkspaceRoleStore
}

/*
NewWorkspaceCalendarService creates a workspace calendar service.
*/
func NewWorkspaceCalendarService(
	workspaceStore store.WorkspaceStore,
	workspaceCalendarStore store.WorkspaceCalendarStore,
	workspaceRoleStore store.WorkspaceRoleStore,
) *WorkspaceCalendarService {
	return &WorkspaceCalendarService{
		workspaceStore:         workspaceStore,
		workspaceCalendarStore: workspaceCalendarStore,
		workspaceRoleStore:     workspaceRoleStore,
	}
}

/*
ListOffDays returns all workspace off-days for a signed-in user.
*/
func (s *WorkspaceCalendarService) ListOffDays(
	ctx context.Context,
	input ListWorkspaceOffDaysInput,
) ([]domain.WorkspaceOffDay, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to view workspace off-days.")
	}

	workspaceID, err := s.requireWorkspace(ctx, input.WorkspaceID)
	if err != nil {
		return nil, err
	}

	offDays, err := s.workspaceCalendarStore.ListOffDaysByWorkspaceID(ctx, workspaceID)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load workspace off-days.")
	}

	return offDays, nil
}

/*
CreateOffDay creates a workspace-specific holiday or no-standup day.
*/
func (s *WorkspaceCalendarService) CreateOffDay(
	ctx context.Context,
	input CreateWorkspaceOffDayInput,
) (*domain.WorkspaceOffDay, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to create workspace off-days.")
	}

	workspaceID, err := s.requireWorkspace(ctx, input.WorkspaceID)
	if err != nil {
		return nil, err
	}

	if err := s.requireWorkspaceCalendarManagement(ctx, cleanActorUserID, input.IsSystemAdmin, workspaceID); err != nil {
		return nil, err
	}

	date := domain.LocalDate(strings.TrimSpace(input.Date))
	if _, err := parseLocalDate(date); err != nil {
		return nil, NewError(ErrorCodeValidationFailed, "Off-day date must be a real YYYY-MM-DD calendar date.")
	}

	label := strings.TrimSpace(input.Label)
	if label == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Off-day label is required.")
	}

	now := time.Now().UTC()
	offDay := domain.WorkspaceOffDay{
		ID:          domain.ID(uuid.NewString()),
		WorkspaceID: workspaceID,
		Date:        date,
		Label:       label,
		CreatedBy:   cleanActorUserID,
		CreatedAt:   now,
	}

	created, err := s.workspaceCalendarStore.CreateOffDay(ctx, offDay)
	if err != nil {
		if errors.Is(err, store.ErrConflict) {
			return nil, NewError(ErrorCodeConflict, "A workspace off-day already exists for this date.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not create workspace off-day.")
	}

	return created, nil
}

/*
DeleteOffDay deletes a workspace-specific holiday or no-standup day.
*/
func (s *WorkspaceCalendarService) DeleteOffDay(
	ctx context.Context,
	input DeleteWorkspaceOffDayInput,
) error {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return NewError(ErrorCodePermissionDenied, "You must be signed in to delete workspace off-days.")
	}

	workspaceID, err := s.requireWorkspace(ctx, input.WorkspaceID)
	if err != nil {
		return err
	}

	if err := s.requireWorkspaceCalendarManagement(ctx, cleanActorUserID, input.IsSystemAdmin, workspaceID); err != nil {
		return err
	}

	offDayID := domain.ID(strings.TrimSpace(input.OffDayID))
	if offDayID.String() == "" {
		return NewError(ErrorCodeValidationFailed, "Workspace off-day ID is required.")
	}

	err = s.workspaceCalendarStore.DeleteOffDay(ctx, workspaceID, offDayID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return NewError(ErrorCodeNotFound, "Workspace off-day was not found.")
		}

		return NewError(ErrorCodeInternal, "Could not delete workspace off-day.")
	}

	return nil
}

/*
requireWorkspace validates that a workspace exists and returns its ID.
*/
func (s *WorkspaceCalendarService) requireWorkspace(ctx context.Context, workspaceID string) (domain.ID, error) {
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
requireWorkspaceCalendarManagement ensures the actor can change workspace calendar settings.
*/
func (s *WorkspaceCalendarService) requireWorkspaceCalendarManagement(
	ctx context.Context,
	actorUserID string,
	isSystemAdmin bool,
	workspaceID domain.ID,
) error {
	if isSystemAdmin {
		return nil
	}

	hasRole, err := s.workspaceRoleStore.UserHasAnyRole(
		ctx,
		workspaceID,
		actorUserID,
		[]domain.Role{domain.RoleLead},
	)
	if err != nil {
		return NewError(ErrorCodeInternal, "Could not verify workspace calendar permission.")
	}

	if !hasRole {
		return NewError(ErrorCodePermissionDenied, "Only workspace Leads and System Admins can manage workspace off-days.")
	}

	return nil
}
