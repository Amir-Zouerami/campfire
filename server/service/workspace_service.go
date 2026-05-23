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
WorkspaceCapabilities describes the current user's workspace abilities.

PermissionService owns the role and Mattermost inheritance rules that populate
these booleans for frontend navigation and backend enforcement.
*/
type WorkspaceCapabilities struct {
	CanSubmitStandup        bool
	CanManageWorkspace      bool
	CanManageStandups       bool
	CanViewWorkspaceReports bool
	CanApproveLeaves        bool
	CanViewGlobalReports    bool
	CanExportReports        bool
}

/*
WorkspaceByChannelResult contains workspace lookup data plus user capabilities.
*/
type WorkspaceByChannelResult struct {
	Workspace    domain.Workspace
	Capabilities WorkspaceCapabilities
}

/*
CreateWorkspaceInput contains user-submitted workspace setup data.
*/
type CreateWorkspaceInput struct {
	ActorUserID            string
	TeamID                 string
	ChannelID              string
	Name                   string
	Description            string
	BoardURL               string
	Timezone               string
	WorkingDays            []int
	ChannelAdminsAreLeads  bool
	NamedLeadUserIDs       []string
	NamedApproverUserIDs   []string
	CreateDefaultTemplates bool
}

/*
WorkspaceService owns workspace business rules.
*/
type WorkspaceService struct {
	workspaceStore store.WorkspaceStore
}

/*
NewWorkspaceService creates a workspace service.
*/
func NewWorkspaceService(workspaceStore store.WorkspaceStore) *WorkspaceService {
	return &WorkspaceService{
		workspaceStore: workspaceStore,
	}
}

/*
GetByChannel returns a workspace for a Mattermost channel.

When persistence is connected, this will also delegate permission logic to a
PermissionService.
*/
func (s *WorkspaceService) GetByChannel(
	ctx context.Context,
	userID string,
	channelID string,
) (*WorkspaceByChannelResult, error) {
	cleanUserID := strings.TrimSpace(userID)
	if cleanUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to use Campfire.")
	}

	cleanChannelID := strings.TrimSpace(channelID)
	if cleanChannelID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Channel ID is required.")
	}

	workspace, err := s.workspaceStore.GetByChannelID(ctx, cleanChannelID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeWorkspaceNotConfigured, "Campfire is not configured for this channel yet.")
		}

		if errors.Is(err, store.ErrUnavailable) {
			return nil, NewError(ErrorCodeInternal, "Workspace persistence is not connected yet.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load the workspace.")
	}

	return &WorkspaceByChannelResult{
		Workspace: *workspace,
		Capabilities: WorkspaceCapabilities{
			CanSubmitStandup:        true,
			CanManageWorkspace:      false,
			CanManageStandups:       false,
			CanViewWorkspaceReports: false,
			CanApproveLeaves:        false,
			CanViewGlobalReports:    false,
			CanExportReports:        false,
		},
	}, nil
}

/*
Create validates and creates a workspace.

The workspace creator becomes a Lead. Mattermost channel admins can also be
treated as Leads through workspace role settings.
*/
func (s *WorkspaceService) Create(ctx context.Context, input CreateWorkspaceInput) (*domain.Workspace, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to create a Campfire workspace.")
	}

	cleanTeamID := strings.TrimSpace(input.TeamID)
	if cleanTeamID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Team ID is required.")
	}

	cleanChannelID := strings.TrimSpace(input.ChannelID)
	if cleanChannelID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Channel ID is required.")
	}

	cleanName := strings.TrimSpace(input.Name)
	if cleanName == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Workspace name is required.")
	}

	cleanTimezone := strings.TrimSpace(input.Timezone)
	if cleanTimezone == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Timezone is required.")
	}

	if _, err := time.LoadLocation(cleanTimezone); err != nil {
		return nil, NewError(ErrorCodeValidationFailed, "Timezone must be a valid IANA timezone.")
	}

	if err := validateWorkingDays(input.WorkingDays); err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	workspaceID := domain.ID(uuid.NewString())

	params := store.CreateWorkspaceParams{
		Workspace: domain.Workspace{
			ID:          workspaceID,
			TeamID:      cleanTeamID,
			ChannelID:   cleanChannelID,
			Name:        cleanName,
			Description: strings.TrimSpace(input.Description),
			BoardURL:    strings.TrimSpace(input.BoardURL),
			Timezone:    cleanTimezone,
			CreatedBy:   cleanActorUserID,
			CreatedAt:   now,
			UpdatedAt:   now,
			IsArchived:  false,
		},
		WorkingDays: buildWorkingDays(workspaceID, input.WorkingDays, now),
		RoleSettings: domain.WorkspaceRoleSettings{
			WorkspaceID:           workspaceID,
			ChannelAdminsAreLeads: input.ChannelAdminsAreLeads,
			SystemAdminsAreAdmins: true,
			CreatedAt:             now,
			UpdatedAt:             now,
		},
		RoleAssignments: buildInitialRoleAssignments(
			workspaceID,
			cleanActorUserID,
			input.NamedLeadUserIDs,
			input.NamedApproverUserIDs,
			now,
		),
		LeaveTypes: buildDefaultLeaveTypes(workspaceID, cleanActorUserID, now),
	}

	if input.CreateDefaultTemplates {
		defaultSetup := buildDefaultWorkspaceSetup(workspaceID, cleanActorUserID, now)
		params.StandupTemplates = defaultSetup.Templates
		params.StandupSchedules = defaultSetup.Schedules
		params.ReminderRules = defaultSetup.Reminders
		params.ReportRules = defaultSetup.Reports
	}

	workspace, err := s.workspaceStore.Create(ctx, params)
	if err != nil {
		if errors.Is(err, store.ErrUnavailable) {
			return nil, NewError(ErrorCodeInternal, "Workspace persistence is not connected yet.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not create the workspace.")
	}

	return workspace, nil
}

/*
validateWorkingDays checks workspace working-day configuration.

Weekdays use Go's time.Weekday numbering: 0 Sunday through 6 Saturday.
*/
func validateWorkingDays(workingDays []int) error {
	if len(workingDays) == 0 {
		return NewError(ErrorCodeValidationFailed, "At least one working day is required.")
	}

	seenDays := map[int]bool{}

	for _, weekday := range workingDays {
		if weekday < int(time.Sunday) || weekday > int(time.Saturday) {
			return NewError(ErrorCodeValidationFailed, "Working days must be between 0 and 6.")
		}

		if seenDays[weekday] {
			return NewError(ErrorCodeValidationFailed, "Working days must not contain duplicates.")
		}

		seenDays[weekday] = true
	}

	return nil
}

/*
buildWorkingDays creates one enabled working-day record for each selected day.
*/
func buildWorkingDays(workspaceID domain.ID, weekdays []int, now time.Time) []domain.WorkspaceWorkingDay {
	workingDays := make([]domain.WorkspaceWorkingDay, 0, len(weekdays))

	for _, weekday := range weekdays {
		workingDays = append(workingDays, domain.WorkspaceWorkingDay{
			ID:          domain.ID(uuid.NewString()),
			WorkspaceID: workspaceID,
			Weekday:     time.Weekday(weekday),
			Enabled:     true,
			CreatedAt:   now,
			UpdatedAt:   now,
		})
	}

	return workingDays
}

/*
buildInitialRoleAssignments creates Lead and Approver assignments for a new workspace.
*/
func buildInitialRoleAssignments(
	workspaceID domain.ID,
	actorUserID string,
	namedLeadUserIDs []string,
	namedApproverUserIDs []string,
	now time.Time,
) []domain.WorkspaceRoleAssignment {
	assignments := make([]domain.WorkspaceRoleAssignment, 0)

	assignments = appendUniqueRoleAssignment(assignments, workspaceID, actorUserID, domain.RoleLead, actorUserID, now)

	for _, leadUserID := range namedLeadUserIDs {
		assignments = appendUniqueRoleAssignment(
			assignments,
			workspaceID,
			strings.TrimSpace(leadUserID),
			domain.RoleLead,
			actorUserID,
			now,
		)
	}

	for _, approverUserID := range namedApproverUserIDs {
		assignments = appendUniqueRoleAssignment(
			assignments,
			workspaceID,
			strings.TrimSpace(approverUserID),
			domain.RoleApprover,
			actorUserID,
			now,
		)
	}

	return assignments
}

/*
appendUniqueRoleAssignment appends a role assignment if the same user/role has not
already been added.
*/
func appendUniqueRoleAssignment(
	assignments []domain.WorkspaceRoleAssignment,
	workspaceID domain.ID,
	userID string,
	role domain.Role,
	createdBy string,
	now time.Time,
) []domain.WorkspaceRoleAssignment {
	cleanUserID := strings.TrimSpace(userID)
	if cleanUserID == "" {
		return assignments
	}

	for _, existing := range assignments {
		if existing.UserID == cleanUserID && existing.Role == role {
			return assignments
		}
	}

	return append(assignments, domain.WorkspaceRoleAssignment{
		ID:          domain.ID(uuid.NewString()),
		WorkspaceID: workspaceID,
		UserID:      cleanUserID,
		Role:        role,
		CreatedBy:   createdBy,
		CreatedAt:   now,
	})
}
