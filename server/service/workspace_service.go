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
WorkspaceCapabilities describes the current user's workspace abilities.

This is intentionally simple for MVP. A dedicated PermissionService will own
deeper role logic later.
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

The workspace creator becomes a Lead later when persistence and ID generation
are connected.
*/
func (s *WorkspaceService) Create(ctx context.Context, input CreateWorkspaceInput) (*domain.Workspace, error) {
	if strings.TrimSpace(input.ActorUserID) == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to create a Campfire workspace.")
	}

	if strings.TrimSpace(input.TeamID) == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Team ID is required.")
	}

	if strings.TrimSpace(input.ChannelID) == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Channel ID is required.")
	}

	if strings.TrimSpace(input.Name) == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Workspace name is required.")
	}

	if strings.TrimSpace(input.Timezone) == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Timezone is required.")
	}

	if _, err := time.LoadLocation(input.Timezone); err != nil {
		return nil, NewError(ErrorCodeValidationFailed, "Timezone must be a valid IANA timezone.")
	}

	if err := validateWorkingDays(input.WorkingDays); err != nil {
		return nil, err
	}

	_, err := s.workspaceStore.Create(ctx, store.CreateWorkspaceParams{})
	if err != nil {
		if errors.Is(err, store.ErrUnavailable) {
			return nil, NewError(ErrorCodeInternal, "Workspace persistence is not connected yet.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not create the workspace.")
	}

	return nil, NewError(ErrorCodeInternal, "Workspace creation result was empty.")
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
