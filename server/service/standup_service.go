package service

import (
	"context"
	"errors"
	"strings"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/store"
)

/*
StandupConfiguration contains templates, questions, and schedules for a workspace.
*/
type StandupConfiguration struct {
	Templates []domain.StandupTemplate
	Questions []domain.StandupQuestion
	Schedules []domain.StandupSchedule
}

/*
ListStandupConfigurationInput contains standup configuration query fields.
*/
type ListStandupConfigurationInput struct {
	ActorUserID string
	WorkspaceID string
}

/*
StandupService owns standup template and schedule behavior.
*/
type StandupService struct {
	workspaceStore store.WorkspaceStore
	standupStore   store.StandupStore
}

/*
NewStandupService creates a standup service.
*/
func NewStandupService(
	workspaceStore store.WorkspaceStore,
	standupStore store.StandupStore,
) *StandupService {
	return &StandupService{
		workspaceStore: workspaceStore,
		standupStore:   standupStore,
	}
}

/*
ListConfiguration returns standup templates, questions, and schedules for a workspace.
*/
func (s *StandupService) ListConfiguration(
	ctx context.Context,
	input ListStandupConfigurationInput,
) (*StandupConfiguration, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to view standup configuration.")
	}

	cleanWorkspaceID := strings.TrimSpace(input.WorkspaceID)
	if cleanWorkspaceID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
	}

	workspaceID := domain.ID(cleanWorkspaceID)
	if _, err := s.workspaceStore.GetByID(ctx, workspaceID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Workspace was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load workspace.")
	}

	templates, err := s.standupStore.ListTemplatesByWorkspaceID(ctx, workspaceID)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load standup templates.")
	}

	questions, err := s.standupStore.ListQuestionsByWorkspaceID(ctx, workspaceID)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load standup questions.")
	}

	schedules, err := s.standupStore.ListSchedulesByWorkspaceID(ctx, workspaceID)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load standup schedules.")
	}

	return &StandupConfiguration{
		Templates: templates,
		Questions: questions,
		Schedules: schedules,
	}, nil
}
