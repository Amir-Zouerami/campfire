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
ListWorkspaceWorkingDaysInput contains filters for listing workspace working days.
*/
type ListWorkspaceWorkingDaysInput struct {
	ActorUserID string
	WorkspaceID string
}

/*
UpdateWorkspaceWorkingDaysInput contains user-submitted working-day settings.
*/
type UpdateWorkspaceWorkingDaysInput struct {
	ActorUserID   string
	IsSystemAdmin bool
	WorkspaceID   string
	WorkingDays   []int
}

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
ListWorkingDays returns all seven weekdays with enabled state for a workspace.
*/
func (s *WorkspaceCalendarService) ListWorkingDays(
	ctx context.Context,
	input ListWorkspaceWorkingDaysInput,
) ([]domain.WorkspaceWorkingDay, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to view workspace working days.")
	}

	workspaceID, err := s.requireWorkspace(ctx, input.WorkspaceID)
	if err != nil {
		return nil, err
	}

	workingDays, err := s.workspaceCalendarStore.ListWorkingDaysByWorkspaceID(ctx, workspaceID)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load workspace working days.")
	}

	return expandWorkingDays(workspaceID, workingDays), nil
}

/*
UpdateWorkingDays replaces the workspace working-day configuration.
*/
func (s *WorkspaceCalendarService) UpdateWorkingDays(
	ctx context.Context,
	input UpdateWorkspaceWorkingDaysInput,
) ([]domain.WorkspaceWorkingDay, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to update workspace working days.")
	}

	workspaceID, err := s.requireWorkspace(ctx, input.WorkspaceID)
	if err != nil {
		return nil, err
	}

	if err := s.requireWorkspaceCalendarManagement(ctx, cleanActorUserID, input.IsSystemAdmin, workspaceID); err != nil {
		return nil, err
	}

	if err := validateWorkspaceCalendarWorkingDays(input.WorkingDays); err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	replacementRows := buildWorkspaceCalendarWorkingDays(workspaceID, input.WorkingDays, now)

	workingDays, err := s.workspaceCalendarStore.ReplaceWorkingDays(ctx, workspaceID, replacementRows)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not update workspace working days.")
	}

	return expandWorkingDays(workspaceID, workingDays), nil
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
validateWorkspaceCalendarWorkingDays verifies that weekday input contains unique values from 0 through 6.
*/
func validateWorkspaceCalendarWorkingDays(workingDays []int) error {
	if len(workingDays) == 0 {
		return NewError(ErrorCodeValidationFailed, "At least one working day is required.")
	}

	seen := map[int]bool{}
	for _, weekday := range workingDays {
		if weekday < int(time.Sunday) || weekday > int(time.Saturday) {
			return NewError(ErrorCodeValidationFailed, "Working days must be weekday numbers from 0 to 6.")
		}

		if seen[weekday] {
			return NewError(ErrorCodeValidationFailed, "Working days cannot contain duplicates.")
		}

		seen[weekday] = true
	}

	return nil
}

/*
buildWorkspaceCalendarWorkingDays creates explicit enabled/disabled rows for all seven weekdays.
*/
func buildWorkspaceCalendarWorkingDays(
	workspaceID domain.ID,
	weekdays []int,
	now time.Time,
) []domain.WorkspaceWorkingDay {
	enabledByWeekday := map[int]bool{}
	for _, weekday := range weekdays {
		enabledByWeekday[weekday] = true
	}

	workingDays := make([]domain.WorkspaceWorkingDay, 0, 7)
	for weekday := int(time.Sunday); weekday <= int(time.Saturday); weekday++ {
		workingDays = append(workingDays, domain.WorkspaceWorkingDay{
			ID:          domain.ID(uuid.NewString()),
			WorkspaceID: workspaceID,
			Weekday:     time.Weekday(weekday),
			Enabled:     enabledByWeekday[weekday],
			CreatedAt:   now,
			UpdatedAt:   now,
		})
	}

	return workingDays
}

/*
expandWorkingDays returns exactly seven weekday rows for API rendering.

Missing weekdays are returned as disabled synthetic rows so the frontend can
render stable Sunday-Saturday toggles.
*/
func expandWorkingDays(
	workspaceID domain.ID,
	workingDays []domain.WorkspaceWorkingDay,
) []domain.WorkspaceWorkingDay {
	byWeekday := map[int]domain.WorkspaceWorkingDay{}
	for _, workingDay := range workingDays {
		byWeekday[int(workingDay.Weekday)] = workingDay
	}

	expanded := make([]domain.WorkspaceWorkingDay, 0, 7)
	for weekday := int(time.Sunday); weekday <= int(time.Saturday); weekday++ {
		if workingDay, exists := byWeekday[weekday]; exists {
			expanded = append(expanded, workingDay)
			continue
		}

		expanded = append(expanded, domain.WorkspaceWorkingDay{
			ID:          "",
			WorkspaceID: workspaceID,
			Weekday:     time.Weekday(weekday),
			Enabled:     false,
			CreatedAt:   time.Time{},
			UpdatedAt:   time.Time{},
		})
	}

	return expanded
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
		return NewError(ErrorCodePermissionDenied, "Only workspace Leads and System Admins can manage workspace calendar settings.")
	}

	return nil
}
