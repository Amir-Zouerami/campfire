package service

import (
	"context"
	"encoding/json"
	"errors"
	"sort"
	"strings"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/store"
	"github.com/google/uuid"
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
StandupOccurrenceSummary contains submissions and missing-user data for one date.
*/
type StandupOccurrenceSummary struct {
	WorkspaceID    string
	OccurrenceDate string
	SortMode       domain.StandupSubmissionSortMode

	MemberUserIDs    []string
	SubmittedUserIDs []string
	MissingUserIDs   []string
	OnLeaveUserIDs   []string
	ExcludedUserIDs  []string

	Submissions []domain.StandupSubmissionWithAnswers
}

/*
ListStandupSubmissionsInput contains standup occurrence listing filters.
*/
type ListStandupSubmissionsInput struct {
	ActorUserID    string
	WorkspaceID    string
	OccurrenceDate string
	SortMode       string
}

/*
GetMyStandupSubmissionInput contains filters for loading the current user's
stored standup answers for one editable occurrence date.
*/
type GetMyStandupSubmissionInput struct {
	ActorUserID    string
	WorkspaceID    string
	OccurrenceDate string
	TemplateID     string
}

/*
SubmitStandupAnswerInput contains one submitted standup answer.
*/
type SubmitStandupAnswerInput struct {
	QuestionID string
	ValueJSON  string
}

/*
ListStandupConfigurationInput contains standup configuration query fields.
*/
type ListStandupConfigurationInput struct {
	ActorUserID     string
	IsSystemAdmin   bool
	WorkspaceID     string
	IncludeInactive bool
}

/*
SubmitStandupInput contains a standup submission request.
*/
type SubmitStandupInput struct {
	ActorUserID    string
	WorkspaceID    string
	TemplateID     string
	ScheduleID     string
	OccurrenceDate string
	Answers        []SubmitStandupAnswerInput
}

/*
CreateStandupTemplateInput contains user-submitted template data.
*/
type CreateStandupTemplateInput struct {
	ActorUserID   string
	IsSystemAdmin bool
	WorkspaceID   string
	Name          string
	Description   string
	Kind          string
	IsActive      bool
}

/*
UpdateStandupTemplateInput contains mutable template data.
*/
type UpdateStandupTemplateInput struct {
	ActorUserID   string
	IsSystemAdmin bool
	WorkspaceID   string
	TemplateID    string
	Name          string
	Description   string
	Kind          string
	IsActive      bool
}

/*
DeleteStandupTemplateInput identifies one template to delete.
*/
type DeleteStandupTemplateInput struct {
	ActorUserID   string
	IsSystemAdmin bool
	WorkspaceID   string
	TemplateID    string
}

/*
CreateStandupQuestionInput contains user-submitted question data.
*/
type CreateStandupQuestionInput struct {
	ActorUserID   string
	IsSystemAdmin bool
	WorkspaceID   string
	TemplateID    string
	Section       string
	Label         string
	HelpText      string
	Placeholder   string
	Type          string
	Required      bool
	ShowInReport  bool
	IsPrivate     bool
	CreatesTasks  bool
	Position      int
	Options       []string
}

/*
UpdateStandupQuestionInput contains mutable question data.
*/
type UpdateStandupQuestionInput struct {
	ActorUserID   string
	IsSystemAdmin bool
	WorkspaceID   string
	QuestionID    string
	TemplateID    string
	Section       string
	Label         string
	HelpText      string
	Placeholder   string
	Type          string
	Required      bool
	ShowInReport  bool
	IsPrivate     bool
	CreatesTasks  bool
	Position      int
	Options       []string
}

/*
DeleteStandupQuestionInput identifies one question to delete.
*/
type DeleteStandupQuestionInput struct {
	ActorUserID   string
	IsSystemAdmin bool
	WorkspaceID   string
	QuestionID    string
}

/*
CreateStandupScheduleInput contains user-submitted schedule data.
*/
type CreateStandupScheduleInput struct {
	ActorUserID             string
	IsSystemAdmin           bool
	WorkspaceID             string
	TemplateID              string
	Kind                    string
	Enabled                 bool
	OpensAt                 string
	TimeOfDay               string
	SkipNonWorkingDays      bool
	WeeklyMode              string
	SkipDailyWhenWeeklyRuns bool
}

/*
UpdateStandupScheduleInput contains mutable schedule data.
*/
type UpdateStandupScheduleInput struct {
	ActorUserID             string
	IsSystemAdmin           bool
	WorkspaceID             string
	ScheduleID              string
	TemplateID              string
	Kind                    string
	Enabled                 bool
	OpensAt                 string
	TimeOfDay               string
	SkipNonWorkingDays      bool
	WeeklyMode              string
	SkipDailyWhenWeeklyRuns bool
}

/*
DeleteStandupScheduleInput identifies one schedule to delete.
*/
type DeleteStandupScheduleInput struct {
	ActorUserID   string
	IsSystemAdmin bool
	WorkspaceID   string
	ScheduleID    string
}

/*
SubmitStandupResult contains the saved submission and answers.
*/
type SubmitStandupResult struct {
	Submission   domain.StandupSubmission
	Answers      []domain.StandupAnswer
	CreatedTasks []domain.Task
}

/*
StandupService owns standup template, schedule, and submission behavior.
*/
type StandupService struct {
	workspaceStore         store.WorkspaceStore
	workspaceRoleStore     store.WorkspaceRoleStore
	workspaceCalendarStore store.WorkspaceCalendarStore
	globalSkipDateStore    store.GlobalSkipDateStore
	standupStore           store.StandupStore
	taskStore              store.TaskStore
	leaveStore             store.LeaveStore
	memberProvider         WorkspaceMemberProvider
}

/*
NewStandupService creates a standup service.
*/
func NewStandupService(
	workspaceStore store.WorkspaceStore,
	workspaceRoleStore store.WorkspaceRoleStore,
	workspaceCalendarStore store.WorkspaceCalendarStore,
	globalSkipDateStore store.GlobalSkipDateStore,
	standupStore store.StandupStore,
	taskStore store.TaskStore,
	leaveStore store.LeaveStore,
	memberProvider WorkspaceMemberProvider,
) *StandupService {
	return &StandupService{
		workspaceStore:         workspaceStore,
		workspaceRoleStore:     workspaceRoleStore,
		workspaceCalendarStore: workspaceCalendarStore,
		globalSkipDateStore:    globalSkipDateStore,
		standupStore:           standupStore,
		taskStore:              taskStore,
		leaveStore:             leaveStore,
		memberProvider:         memberProvider,
	}
}

/*
CreateTemplate creates a standup template.
*/
func (s *StandupService) CreateTemplate(
	ctx context.Context,
	input CreateStandupTemplateInput,
) (*domain.StandupTemplate, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to create standup templates.")
	}

	workspaceID, err := s.requireStandupWorkspace(ctx, input.WorkspaceID)
	if err != nil {
		return nil, err
	}

	if err := s.requireStandupManagement(ctx, cleanActorUserID, input.IsSystemAdmin, workspaceID); err != nil {
		return nil, err
	}

	name := normalizeStandupTemplateName(input.Name)
	if name == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Template name is required.")
	}

	kind := domain.StandupKind(strings.TrimSpace(input.Kind))
	if !isValidStandupKind(kind) {
		return nil, NewError(ErrorCodeValidationFailed, "Standup template kind is not supported.")
	}

	now := time.Now().UTC()
	template := domain.StandupTemplate{
		ID:          domain.ID(uuid.NewString()),
		WorkspaceID: workspaceID,
		Name:        name,
		Description: strings.TrimSpace(input.Description),
		Kind:        kind,
		IsDefault:   false,
		IsActive:    input.IsActive,
		CreatedBy:   cleanActorUserID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	created, err := s.standupStore.CreateTemplate(ctx, template)
	if err != nil {
		if errors.Is(err, store.ErrConflict) {
			return nil, NewError(ErrorCodeConflict, "A standup template with this name already exists in this workspace.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not create standup template.")
	}

	return created, nil
}

/*
UpdateTemplate updates a standup template.
*/
func (s *StandupService) UpdateTemplate(
	ctx context.Context,
	input UpdateStandupTemplateInput,
) (*domain.StandupTemplate, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to update standup templates.")
	}

	workspaceID, err := s.requireStandupWorkspace(ctx, input.WorkspaceID)
	if err != nil {
		return nil, err
	}

	if err := s.requireStandupManagement(ctx, cleanActorUserID, input.IsSystemAdmin, workspaceID); err != nil {
		return nil, err
	}

	templateID := domain.ID(strings.TrimSpace(input.TemplateID))
	if templateID.String() == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Template ID is required.")
	}

	existingTemplate, err := s.standupStore.GetTemplateByID(ctx, workspaceID, templateID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Standup template was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load standup template.")
	}

	name := normalizeStandupTemplateName(input.Name)
	if name == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Template name is required.")
	}

	kind := domain.StandupKind(strings.TrimSpace(input.Kind))
	if !isValidStandupKind(kind) {
		return nil, NewError(ErrorCodeValidationFailed, "Standup template kind is not supported.")
	}

	updatedTemplate := *existingTemplate
	updatedTemplate.Name = name
	updatedTemplate.Description = strings.TrimSpace(input.Description)
	updatedTemplate.Kind = kind
	updatedTemplate.IsActive = input.IsActive
	updatedTemplate.UpdatedAt = time.Now().UTC()

	updated, err := s.standupStore.UpdateTemplate(ctx, updatedTemplate)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Standup template was not found.")
		}

		if errors.Is(err, store.ErrConflict) {
			return nil, NewError(ErrorCodeConflict, "A standup template with this name already exists in this workspace.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not update standup template.")
	}

	return updated, nil
}

/*
DeleteTemplate deletes a standup template.

Deleting a template is intentionally an admin-level destructive operation: the
database cascades dependent questions, schedules, submissions, report rules,
reminder rules, and generated rows so accidental form-builder clutter can be
removed cleanly instead of leaving dangling configuration behind.
*/
func (s *StandupService) DeleteTemplate(ctx context.Context, input DeleteStandupTemplateInput) error {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return NewError(ErrorCodePermissionDenied, "You must be signed in to delete standup templates.")
	}

	workspaceID, err := s.requireStandupWorkspace(ctx, input.WorkspaceID)
	if err != nil {
		return err
	}

	if err := s.requireStandupManagement(ctx, cleanActorUserID, input.IsSystemAdmin, workspaceID); err != nil {
		return err
	}

	templateID := domain.ID(strings.TrimSpace(input.TemplateID))
	if templateID.String() == "" {
		return NewError(ErrorCodeValidationFailed, "Template ID is required.")
	}

	if err := s.standupStore.DeleteTemplate(ctx, workspaceID, templateID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return NewError(ErrorCodeNotFound, "Standup template was not found.")
		}

		return NewError(ErrorCodeInternal, "Could not delete standup template.")
	}

	return nil
}

/*
CreateQuestion creates a standup question.
*/
func (s *StandupService) CreateQuestion(
	ctx context.Context,
	input CreateStandupQuestionInput,
) (*domain.StandupQuestion, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to create standup questions.")
	}

	workspaceID, err := s.requireStandupWorkspace(ctx, input.WorkspaceID)
	if err != nil {
		return nil, err
	}

	if err := s.requireStandupManagement(ctx, cleanActorUserID, input.IsSystemAdmin, workspaceID); err != nil {
		return nil, err
	}

	templateID := domain.ID(strings.TrimSpace(input.TemplateID))
	if templateID.String() == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Template ID is required.")
	}

	if _, err := s.standupStore.GetTemplateByID(ctx, workspaceID, templateID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Standup template was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load standup template.")
	}

	question, err := buildStandupQuestionFromInput(
		workspaceID,
		templateID,
		domain.ID(uuid.NewString()),
		input.Section,
		input.Label,
		input.HelpText,
		input.Placeholder,
		input.Type,
		input.Required,
		input.ShowInReport,
		input.IsPrivate,
		input.CreatesTasks,
		input.Position,
		input.Options,
		time.Now().UTC(),
	)
	if err != nil {
		return nil, err
	}

	created, err := s.standupStore.CreateQuestion(ctx, *question)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not create standup question.")
	}

	return created, nil
}

/*
UpdateQuestion updates a standup question.
*/
func (s *StandupService) UpdateQuestion(
	ctx context.Context,
	input UpdateStandupQuestionInput,
) (*domain.StandupQuestion, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to update standup questions.")
	}

	workspaceID, err := s.requireStandupWorkspace(ctx, input.WorkspaceID)
	if err != nil {
		return nil, err
	}

	if err := s.requireStandupManagement(ctx, cleanActorUserID, input.IsSystemAdmin, workspaceID); err != nil {
		return nil, err
	}

	questionID := domain.ID(strings.TrimSpace(input.QuestionID))
	if questionID.String() == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Question ID is required.")
	}

	existingQuestion, err := s.standupStore.GetQuestionByID(ctx, workspaceID, questionID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Standup question was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load standup question.")
	}

	templateID := domain.ID(strings.TrimSpace(input.TemplateID))
	if templateID.String() == "" {
		templateID = existingQuestion.TemplateID
	}

	if _, err := s.standupStore.GetTemplateByID(ctx, workspaceID, templateID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Standup template was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load standup template.")
	}

	question, err := buildStandupQuestionFromInput(
		workspaceID,
		templateID,
		questionID,
		input.Section,
		input.Label,
		input.HelpText,
		input.Placeholder,
		input.Type,
		input.Required,
		input.ShowInReport,
		input.IsPrivate,
		input.CreatesTasks,
		input.Position,
		input.Options,
		time.Now().UTC(),
	)
	if err != nil {
		return nil, err
	}

	question.CreatedAt = existingQuestion.CreatedAt

	updated, err := s.standupStore.UpdateQuestion(ctx, *question)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Standup question was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not update standup question.")
	}

	return updated, nil
}

/*
DeleteQuestion deletes a standup question.

Answers tied to the deleted question are removed by database cascade so reports
and submissions no longer reference a removed form field.
*/
func (s *StandupService) DeleteQuestion(ctx context.Context, input DeleteStandupQuestionInput) error {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return NewError(ErrorCodePermissionDenied, "You must be signed in to delete standup questions.")
	}

	workspaceID, err := s.requireStandupWorkspace(ctx, input.WorkspaceID)
	if err != nil {
		return err
	}

	if err := s.requireStandupManagement(ctx, cleanActorUserID, input.IsSystemAdmin, workspaceID); err != nil {
		return err
	}

	questionID := domain.ID(strings.TrimSpace(input.QuestionID))
	if questionID.String() == "" {
		return NewError(ErrorCodeValidationFailed, "Question ID is required.")
	}

	if err := s.standupStore.DeleteQuestion(ctx, workspaceID, questionID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return NewError(ErrorCodeNotFound, "Standup question was not found.")
		}

		return NewError(ErrorCodeInternal, "Could not delete standup question.")
	}

	return nil
}

/*
CreateSchedule creates a standup schedule.
*/
func (s *StandupService) CreateSchedule(
	ctx context.Context,
	input CreateStandupScheduleInput,
) (*domain.StandupSchedule, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to create standup schedules.")
	}

	workspaceID, err := s.requireStandupWorkspace(ctx, input.WorkspaceID)
	if err != nil {
		return nil, err
	}

	if err := s.requireStandupManagement(ctx, cleanActorUserID, input.IsSystemAdmin, workspaceID); err != nil {
		return nil, err
	}

	templateID := domain.ID(strings.TrimSpace(input.TemplateID))
	if templateID.String() == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Template ID is required.")
	}

	if _, err := s.standupStore.GetTemplateByID(ctx, workspaceID, templateID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Standup template was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load standup template.")
	}

	schedule, err := buildStandupScheduleFromInput(
		workspaceID,
		templateID,
		domain.ID(uuid.NewString()),
		input.Kind,
		input.Enabled,
		input.OpensAt,
		input.TimeOfDay,
		input.SkipNonWorkingDays,
		input.WeeklyMode,
		input.SkipDailyWhenWeeklyRuns,
		cleanActorUserID,
		time.Now().UTC(),
	)
	if err != nil {
		return nil, err
	}

	created, err := s.standupStore.CreateSchedule(ctx, *schedule)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not create standup schedule.")
	}

	return created, nil
}

/*
UpdateSchedule updates a standup schedule.
*/
func (s *StandupService) UpdateSchedule(
	ctx context.Context,
	input UpdateStandupScheduleInput,
) (*domain.StandupSchedule, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to update standup schedules.")
	}

	workspaceID, err := s.requireStandupWorkspace(ctx, input.WorkspaceID)
	if err != nil {
		return nil, err
	}

	if err := s.requireStandupManagement(ctx, cleanActorUserID, input.IsSystemAdmin, workspaceID); err != nil {
		return nil, err
	}

	scheduleID := domain.ID(strings.TrimSpace(input.ScheduleID))
	if scheduleID.String() == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Schedule ID is required.")
	}

	existingSchedule, err := s.standupStore.GetScheduleByID(ctx, workspaceID, scheduleID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Standup schedule was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load standup schedule.")
	}

	templateID := domain.ID(strings.TrimSpace(input.TemplateID))
	if templateID.String() == "" {
		templateID = existingSchedule.TemplateID
	}

	if _, err := s.standupStore.GetTemplateByID(ctx, workspaceID, templateID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Standup template was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load standup template.")
	}

	schedule, err := buildStandupScheduleFromInput(
		workspaceID,
		templateID,
		scheduleID,
		input.Kind,
		input.Enabled,
		input.OpensAt,
		input.TimeOfDay,
		input.SkipNonWorkingDays,
		input.WeeklyMode,
		input.SkipDailyWhenWeeklyRuns,
		existingSchedule.CreatedBy,
		time.Now().UTC(),
	)
	if err != nil {
		return nil, err
	}

	schedule.CreatedAt = existingSchedule.CreatedAt

	updated, err := s.standupStore.UpdateSchedule(ctx, *schedule)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Standup schedule was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not update standup schedule.")
	}

	return updated, nil
}

/*
DeleteSchedule deletes a standup schedule.

Deleting a schedule also removes dependent reminder rules, report rules,
notification runs, report runs, and schedule-scoped submissions through database
cascades. This keeps schedule cleanup explicit and deterministic for admins.
*/
func (s *StandupService) DeleteSchedule(ctx context.Context, input DeleteStandupScheduleInput) error {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return NewError(ErrorCodePermissionDenied, "You must be signed in to delete standup schedules.")
	}

	workspaceID, err := s.requireStandupWorkspace(ctx, input.WorkspaceID)
	if err != nil {
		return err
	}

	if err := s.requireStandupManagement(ctx, cleanActorUserID, input.IsSystemAdmin, workspaceID); err != nil {
		return err
	}

	scheduleID := domain.ID(strings.TrimSpace(input.ScheduleID))
	if scheduleID.String() == "" {
		return NewError(ErrorCodeValidationFailed, "Schedule ID is required.")
	}

	if err := s.standupStore.DeleteSchedule(ctx, workspaceID, scheduleID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return NewError(ErrorCodeNotFound, "Standup schedule was not found.")
		}

		return NewError(ErrorCodeInternal, "Could not delete standup schedule.")
	}

	return nil
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

	if input.IncludeInactive {
		if err := s.requireStandupManagement(ctx, cleanActorUserID, input.IsSystemAdmin, workspaceID); err != nil {
			return nil, err
		}
	}

	configuration, err := s.loadConfiguration(ctx, workspaceID, input.IncludeInactive)
	if err != nil {
		return nil, err
	}

	return configuration, nil
}

/*
ListSubmissions returns submissions, missing users, and on-leave users for one occurrence date.
*/
func (s *StandupService) ListSubmissions(
	ctx context.Context,
	input ListStandupSubmissionsInput,
) (*StandupOccurrenceSummary, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to view standup submissions.")
	}

	cleanWorkspaceID := strings.TrimSpace(input.WorkspaceID)
	if cleanWorkspaceID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
	}

	occurrenceDate := domain.LocalDate(strings.TrimSpace(input.OccurrenceDate))
	if _, err := parseLocalDate(occurrenceDate); err != nil {
		return nil, NewError(ErrorCodeValidationFailed, "Occurrence date must be a real YYYY-MM-DD calendar date.")
	}

	workspaceID := domain.ID(cleanWorkspaceID)
	workspace, err := s.workspaceStore.GetByID(ctx, workspaceID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Workspace was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load workspace.")
	}

	submissions, err := s.standupStore.ListSubmissionsWithAnswersByWorkspaceIDAndDate(
		ctx,
		workspaceID,
		occurrenceDate,
	)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load standup submissions.")
	}

	memberUserIDs, err := s.memberProvider.ListWorkspaceMemberUserIDs(ctx, *workspace)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load workspace members.")
	}

	approvedLeaves, err := s.leaveStore.ListApprovedByWorkspaceIDBetween(
		ctx,
		workspaceID,
		occurrenceDate,
		occurrenceDate,
	)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load approved leave.")
	}

	sortMode := normalizeStandupSubmissionSortMode(input.SortMode)
	sortStandupSubmissions(submissions, sortMode)

	memberUserIDs, excludedUserIDs, err := standupParticipantsFromMembers(
		ctx,
		s.workspaceRoleStore,
		workspaceID,
		memberUserIDs,
	)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load standup exclusions.")
	}

	submissions = filterStandupSubmissionsForParticipants(submissions, memberUserIDs)
	submittedUserIDs := submittedUserIDsFromSubmissions(submissions)
	onLeaveUserIDs := onLeaveMemberUserIDs(memberUserIDs, approvedLeaveUserIDSet(approvedLeaves))
	missingUserIDs := missingStandupUserIDs(memberUserIDs, submittedUserIDs, onLeaveUserIDs)

	return &StandupOccurrenceSummary{
		WorkspaceID:    workspaceID.String(),
		OccurrenceDate: occurrenceDate.String(),
		SortMode:       sortMode,

		MemberUserIDs:    memberUserIDs,
		SubmittedUserIDs: submittedUserIDs,
		MissingUserIDs:   missingUserIDs,
		OnLeaveUserIDs:   onLeaveUserIDs,
		ExcludedUserIDs:  excludedUserIDs,

		Submissions: submissions,
	}, nil
}

/*
GetMySubmission returns the current user's stored standup answers for one date
and template so past valid submissions can be edited without exposing the full
team-review submissions endpoint to normal members.
*/
func (s *StandupService) GetMySubmission(
	ctx context.Context,
	input GetMyStandupSubmissionInput,
) (*domain.StandupSubmissionWithAnswers, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to view your standup.")
	}

	cleanWorkspaceID := strings.TrimSpace(input.WorkspaceID)
	if cleanWorkspaceID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
	}

	occurrenceDate := domain.LocalDate(strings.TrimSpace(input.OccurrenceDate))
	if _, err := parseLocalDate(occurrenceDate); err != nil {
		return nil, NewError(ErrorCodeValidationFailed, "Occurrence date must be a real YYYY-MM-DD calendar date.")
	}

	workspaceID := domain.ID(cleanWorkspaceID)
	if _, err := s.workspaceStore.GetByID(ctx, workspaceID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Workspace was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load workspace.")
	}

	submissions, err := s.standupStore.ListSubmissionsWithAnswersByWorkspaceIDAndDate(
		ctx,
		workspaceID,
		occurrenceDate,
	)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load your standup submission.")
	}

	cleanTemplateID := strings.TrimSpace(input.TemplateID)
	for _, submission := range submissions {
		if submission.Submission.UserID != cleanActorUserID {
			continue
		}

		if cleanTemplateID != "" && submission.Submission.TemplateID.String() != cleanTemplateID {
			continue
		}

		matchedSubmission := submission
		return &matchedSubmission, nil
	}

	return nil, nil
}

/*
Submit creates or updates the current user's standup submission for one occurrence.
*/
func (s *StandupService) Submit(ctx context.Context, input SubmitStandupInput) (*SubmitStandupResult, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to submit a standup.")
	}

	cleanWorkspaceID := strings.TrimSpace(input.WorkspaceID)
	if cleanWorkspaceID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
	}

	cleanTemplateID := strings.TrimSpace(input.TemplateID)
	if cleanTemplateID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Template ID is required.")
	}

	cleanScheduleID := strings.TrimSpace(input.ScheduleID)
	if cleanScheduleID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Schedule ID is required.")
	}

	occurrenceDate := domain.LocalDate(strings.TrimSpace(input.OccurrenceDate))
	if _, err := parseLocalDate(occurrenceDate); err != nil {
		return nil, NewError(ErrorCodeValidationFailed, "Occurrence date must be a real YYYY-MM-DD calendar date.")
	}

	workspaceID := domain.ID(cleanWorkspaceID)
	workspace, err := s.workspaceStore.GetByID(ctx, workspaceID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Workspace was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load workspace.")
	}

	configuration, err := s.loadConfiguration(ctx, workspaceID, false)
	if err != nil {
		return nil, err
	}

	template := findTemplate(configuration.Templates, domain.ID(cleanTemplateID))
	if template == nil {
		return nil, NewError(ErrorCodeValidationFailed, "Standup template is invalid for this workspace.")
	}

	schedule := findSchedule(configuration.Schedules, domain.ID(cleanScheduleID))
	if schedule == nil {
		return nil, NewError(ErrorCodeValidationFailed, "Standup schedule is invalid for this workspace.")
	}

	if schedule.TemplateID != template.ID {
		return nil, NewError(ErrorCodeValidationFailed, "Standup schedule does not belong to the selected template.")
	}

	if !schedule.Enabled {
		return nil, NewError(ErrorCodeValidationFailed, "Standup schedule is disabled.")
	}

	if err := requireSubmissionDateIsNotFuture(occurrenceDate, workspace.Timezone); err != nil {
		return nil, err
	}

	if err := requireUserIsStandupParticipant(ctx, s.workspaceRoleStore, workspaceID, cleanActorUserID); err != nil {
		return nil, err
	}

	if err := s.requireStandupRunsForSubmission(ctx, *workspace, occurrenceDate); err != nil {
		return nil, err
	}

	if err := s.requireScheduleAllowsSubmissionDate(ctx, *workspace, *schedule, configuration.Schedules, occurrenceDate); err != nil {
		return nil, err
	}

	templateQuestions := questionsForTemplate(configuration.Questions, template.ID)
	if len(templateQuestions) == 0 {
		return nil, NewError(ErrorCodeValidationFailed, "Standup template has no questions.")
	}

	answers, err := s.buildAnswers(workspaceID, templateQuestions, input.Answers)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	submissionID := domain.ID(uuid.NewString())

	submission := domain.StandupSubmission{
		ID:               submissionID,
		WorkspaceID:      workspaceID,
		TemplateID:       template.ID,
		ScheduleID:       schedule.ID,
		UserID:           cleanActorUserID,
		OccurrenceDate:   occurrenceDate,
		FirstSubmittedAt: now,
		LastUpdatedAt:    now,
		Status:           domain.StandupSubmissionStatusSubmitted,
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	for index := range answers {
		answers[index].SubmissionID = submissionID
		answers[index].CreatedAt = now
		answers[index].UpdatedAt = now
	}

	result, err := s.standupStore.UpsertSubmission(ctx, store.UpsertStandupSubmissionParams{
		Submission: submission,
		Answers:    answers,
	})
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not save standup submission.")
	}

	createdTasks, err := s.createTasksFromStandupAnswers(ctx, result.Submission, result.Answers, templateQuestions)
	if err != nil {
		return nil, err
	}

	return &SubmitStandupResult{
		Submission:   result.Submission,
		Answers:      result.Answers,
		CreatedTasks: createdTasks,
	}, nil
}

/*
createTasksFromStandupAnswers creates active task rows from explicit work-item
questions after a standup submission is saved.

This keeps task creation as server-owned behavior instead of depending on a
frontend follow-up call. It only uses questions marked with CreatesTasks, so
admins can choose which standup inputs should produce tracked tasks.
*/
func (s *StandupService) createTasksFromStandupAnswers(
	ctx context.Context,
	submission domain.StandupSubmission,
	answers []domain.StandupAnswer,
	questions []domain.StandupQuestion,
) ([]domain.Task, error) {
	if s.taskStore == nil {
		return []domain.Task{}, nil
	}

	questionByID := map[string]domain.StandupQuestion{}
	for _, question := range questions {
		questionByID[question.ID.String()] = question
	}

	existingTasks, err := s.taskStore.ListTasksByWorkspaceIDAndUserID(
		ctx,
		submission.WorkspaceID,
		submission.UserID,
		true,
	)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load existing tasks for standup task sync.")
	}

	existingTitleKeys := map[string]bool{}
	for _, task := range existingTasks {
		existingTitleKeys[normalizedTaskTitleKey(task.Title)] = true
	}

	seenInSubmission := map[string]bool{}
	createdTasks := []domain.Task{}
	now := time.Now().UTC()

	for _, answer := range answers {
		question, ok := questionByID[answer.QuestionID.String()]
		if !ok || !question.CreatesTasks {
			continue
		}

		for _, title := range taskTitlesFromAnswerValue(answer.ValueJSON) {
			titleKey := normalizedTaskTitleKey(title)
			if titleKey == "" || existingTitleKeys[titleKey] || seenInSubmission[titleKey] {
				continue
			}

			task := domain.Task{
				ID:                 domain.ID(uuid.NewString()),
				WorkspaceID:        submission.WorkspaceID,
				UserID:             submission.UserID,
				SourceSubmissionID: submission.ID,
				SourceAnswerID:     answer.ID,
				Title:              title,
				Description:        "Created from Campfire standup work item.",
				ProjectID:          "",
				CategoryID:         "",
				Status:             domain.TaskStatusActive,
				BoardURL:           "",
				CreatedBy:          submission.UserID,
				CreatedAt:          now,
				UpdatedAt:          now,
				CompletedAt:        nil,
			}

			created, err := s.taskStore.CreateTask(ctx, store.CreateTaskParams{Task: task})
			if err != nil {
				return nil, NewError(ErrorCodeInternal, "Could not create tasks from standup work items.")
			}

			createdTasks = append(createdTasks, *created)
			existingTitleKeys[titleKey] = true
			seenInSubmission[titleKey] = true
		}
	}

	return createdTasks, nil
}

/*
taskTitlesFromAnswerValue extracts one task title per answer row.
*/
func taskTitlesFromAnswerValue(valueJSON string) []string {
	rawValue := strings.TrimSpace(valueJSON)
	if rawValue == "" || rawValue == "null" {
		return []string{}
	}

	var answerText string
	if err := json.Unmarshal([]byte(rawValue), &answerText); err != nil {
		answerText = rawValue
	}

	lines := strings.Split(answerText, "\n")
	titles := make([]string, 0, len(lines))

	for _, line := range lines {
		title := cleanTaskTitleLine(line)
		if title != "" {
			titles = append(titles, title)
		}
	}

	return titles
}

/*
cleanTaskTitleLine strips Markdown/list prefixes from one itemized answer row.
*/
func cleanTaskTitleLine(value string) string {
	line := strings.TrimSpace(value)
	line = strings.TrimLeft(line, "-*• ")

	for index, char := range line {
		if char == '.' || char == ')' {
			prefix := line[:index]
			if prefix != "" && allASCIIDigits(prefix) {
				return strings.TrimSpace(line[index+1:])
			}
			break
		}

		if char < '0' || char > '9' {
			break
		}
	}

	return strings.TrimSpace(line)
}

/*
allASCIIDigits reports whether a string contains only ASCII digits.
*/
func allASCIIDigits(value string) bool {
	for _, char := range value {
		if char < '0' || char > '9' {
			return false
		}
	}

	return value != ""
}

/*
normalizedTaskTitleKey mirrors the frontend duplicate-prevention key.
*/
func normalizedTaskTitleKey(value string) string {
	return strings.ToLower(strings.Join(strings.Fields(value), " "))
}

/*
requireSubmissionDateIsNotFuture allows today and past corrections while still
blocking future standup submissions.
*/
func requireSubmissionDateIsNotFuture(occurrenceDate domain.LocalDate, timezone string) error {
	location := time.UTC
	cleanTimezone := strings.TrimSpace(timezone)
	if cleanTimezone != "" {
		loadedLocation, err := time.LoadLocation(cleanTimezone)
		if err == nil {
			location = loadedLocation
		}
	}

	today := domain.LocalDate(time.Now().In(location).Format("2006-01-02"))
	if occurrenceDate.String() > today.String() {
		return NewError(
			ErrorCodeValidationFailed,
			"Standups cannot be submitted for future dates.",
		)
	}

	return nil
}

/*
requireStandupRunsForSubmission prevents manual submissions on workspace/global off-days and full-team leave days.
*/
func (s *StandupService) requireStandupRunsForSubmission(
	ctx context.Context,
	workspace domain.Workspace,
	occurrenceDate domain.LocalDate,
) error {
	date, err := parseLocalDate(occurrenceDate)
	if err != nil {
		return NewError(ErrorCodeValidationFailed, "Occurrence date must be a real YYYY-MM-DD calendar date.")
	}

	isWorkingDay, err := s.workspaceCalendarStore.IsWorkingDay(ctx, workspace.ID, int(date.Weekday()))
	if err != nil {
		return NewError(ErrorCodeInternal, "Could not evaluate workspace working day.")
	}

	globalOffDays, err := s.globalSkipDateStore.ListBetween(ctx, occurrenceDate, occurrenceDate)
	if err != nil {
		return NewError(ErrorCodeInternal, "Could not evaluate global off-days.")
	}

	workspaceOffDays, err := s.workspaceCalendarStore.ListOffDaysBetween(ctx, workspace.ID, occurrenceDate, occurrenceDate)
	if err != nil {
		return NewError(ErrorCodeInternal, "Could not evaluate workspace off-days.")
	}

	approvedLeaves, err := s.leaveStore.ListApprovedByWorkspaceIDBetween(ctx, workspace.ID, occurrenceDate, occurrenceDate)
	if err != nil {
		return NewError(ErrorCodeInternal, "Could not evaluate approved leave.")
	}

	memberUserIDs, err := s.memberProvider.ListWorkspaceMemberUserIDs(ctx, workspace)
	if err != nil {
		return NewError(ErrorCodeInternal, "Could not evaluate workspace members.")
	}

	memberUserIDs, excludedUserIDs, err := standupParticipantsFromMembers(ctx, s.workspaceRoleStore, workspace.ID, memberUserIDs)
	if err != nil {
		return NewError(ErrorCodeInternal, "Could not evaluate standup exclusions.")
	}

	isLastWorkingDayOfWeek, err := s.isLastWorkingDayOfWeek(ctx, workspace, date)
	if err != nil {
		return err
	}

	decision := buildStandupRunDecision(
		workspace.ID,
		occurrenceDate,
		isWorkingDay,
		isLastWorkingDayOfWeek,
		globalOffDays,
		workspaceOffDays,
		approvedLeaves,
		memberUserIDs,
		excludedUserIDs,
	)
	if !decision.ShouldRun {
		return NewError(ErrorCodeValidationFailed, decision.Message)
	}

	return nil
}

/*
requireScheduleAllowsSubmissionDate enforces schedule-specific rules after the
shared runtime decision has confirmed the date is a valid standup day.
*/
func (s *StandupService) requireScheduleAllowsSubmissionDate(
	ctx context.Context,
	workspace domain.Workspace,
	schedule domain.StandupSchedule,
	schedules []domain.StandupSchedule,
	occurrenceDate domain.LocalDate,
) error {
	date, err := parseLocalDate(occurrenceDate)
	if err != nil {
		return NewError(ErrorCodeValidationFailed, "Occurrence date must be a real YYYY-MM-DD calendar date.")
	}

	isLastWorkingDayOfWeek, err := s.isLastWorkingDayOfWeek(ctx, workspace, date)
	if err != nil {
		return err
	}

	switch schedule.Kind {
	case domain.StandupKindWeekly:
		if schedule.WeeklyMode == domain.WeeklyModeLastWorkingDay && !isLastWorkingDayOfWeek {
			return NewError(ErrorCodeValidationFailed, "Weekly standups can only be submitted on the workspace's last working day of the week.")
		}

	case domain.StandupKindDaily:
		// Daily and weekly schedules are independent. A weekly schedule must never
		// suppress a daily submission window for the same workspace date.
	}

	return nil
}

/*
isLastWorkingDayOfWeek returns true when a date is the final enabled working
weekday in the workspace-local week order.
*/
func (s *StandupService) isLastWorkingDayOfWeek(
	ctx context.Context,
	workspace domain.Workspace,
	date time.Time,
) (bool, error) {
	workingDays, err := s.workspaceCalendarStore.ListWorkingDaysByWorkspaceID(ctx, workspace.ID)
	if err != nil {
		return false, NewError(ErrorCodeInternal, "Could not evaluate workspace working days.")
	}

	return isLastWorkingDayInWeek(date, workspace.Timezone, workingDays), nil
}

/*
requireStandupWorkspace validates that a workspace exists and returns its ID.
*/
func (s *StandupService) requireStandupWorkspace(ctx context.Context, workspaceID string) (domain.ID, error) {
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
requireStandupManagement ensures the actor can manage standup configuration.
*/
func (s *StandupService) requireStandupManagement(
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
		return NewError(ErrorCodeInternal, "Could not verify standup management permission.")
	}

	if !hasRole {
		return NewError(ErrorCodePermissionDenied, "Only workspace Leads and System Admins can manage standup forms.")
	}

	return nil
}

/*
buildStandupQuestionFromInput validates and builds a standup question.
*/
func buildStandupQuestionFromInput(
	workspaceID domain.ID,
	templateID domain.ID,
	questionID domain.ID,
	section string,
	label string,
	helpText string,
	placeholder string,
	questionType string,
	required bool,
	showInReport bool,
	isPrivate bool,
	createsTasks bool,
	position int,
	options []string,
	now time.Time,
) (*domain.StandupQuestion, error) {
	cleanLabel := strings.TrimSpace(label)
	if cleanLabel == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Question label is required.")
	}

	if position < 0 {
		return nil, NewError(ErrorCodeValidationFailed, "Question position cannot be negative.")
	}

	typedQuestion := domain.QuestionType(strings.TrimSpace(questionType))
	if !isValidQuestionType(typedQuestion) {
		return nil, NewError(ErrorCodeValidationFailed, "Question type is not supported.")
	}

	if createsTasks && !questionTypeCanCreateTasks(typedQuestion) {
		return nil, NewError(ErrorCodeValidationFailed, "Only work-items standup questions can create tasks.")
	}

	cleanOptions := normalizeQuestionOptions(options)
	if questionTypeRequiresOptions(typedQuestion) && len(cleanOptions) == 0 {
		return nil, NewError(ErrorCodeValidationFailed, "This question type requires at least one option.")
	}

	optionsJSON, err := json.Marshal(cleanOptions)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not encode question options.")
	}

	return &domain.StandupQuestion{
		ID:           questionID,
		WorkspaceID:  workspaceID,
		TemplateID:   templateID,
		Section:      strings.TrimSpace(section),
		QuestionKey:  questionID.String(),
		Label:        cleanLabel,
		Prompt:       cleanLabel,
		HelpText:     strings.TrimSpace(helpText),
		Placeholder:  strings.TrimSpace(placeholder),
		Type:         typedQuestion,
		Required:     required,
		ShowInReport: showInReport,
		IsPrivate:    isPrivate,
		CreatesTasks: createsTasks,
		Position:     position,
		SortOrder:    position,
		OptionsJSON:  string(optionsJSON),
		Options:      cleanOptions,
		CreatedAt:    now,
		UpdatedAt:    now,
	}, nil
}

/*
normalizeQuestionOptions trims, de-duplicates, and preserves option order.
*/
func normalizeQuestionOptions(options []string) []string {
	seen := map[string]bool{}
	cleanOptions := make([]string, 0, len(options))

	for _, option := range options {
		cleanOption := strings.TrimSpace(option)
		if cleanOption == "" || seen[cleanOption] {
			continue
		}

		seen[cleanOption] = true
		cleanOptions = append(cleanOptions, cleanOption)
	}

	return cleanOptions
}

/*
isValidStandupKind returns true when a template kind is supported.
*/
func isValidStandupKind(kind domain.StandupKind) bool {
	switch kind {
	case domain.StandupKindDaily, domain.StandupKindWeekly, domain.StandupKindCustom:
		return true
	default:
		return false
	}
}

/*
isValidQuestionType returns true when a question type is supported.
*/
func isValidQuestionType(questionType domain.QuestionType) bool {
	switch questionType {
	case domain.QuestionTypeText,
		domain.QuestionTypeLongText,
		domain.QuestionTypeWorkItems,
		domain.QuestionTypeDate,
		domain.QuestionTypeTime,
		domain.QuestionTypeDateTime,
		domain.QuestionTypeCheckbox,
		domain.QuestionTypeBoolean,
		domain.QuestionTypeDropdown,
		domain.QuestionTypeMultiSelect,
		domain.QuestionTypeNumber,
		domain.QuestionTypeDuration:
		return true
	default:
		return false
	}
}

/*
questionTypeCanCreateTasks returns true when a standup question can safely
produce task records from itemized answer text.

Only the explicit work-items question type is allowed. Plain text questions are
freeform narrative fields and must not secretly create task records.
*/
func questionTypeCanCreateTasks(questionType domain.QuestionType) bool {
	switch questionType {
	case domain.QuestionTypeWorkItems:
		return true
	default:
		return false
	}
}

/*
questionTypeRequiresOptions returns true when a question needs selectable options.
*/
func questionTypeRequiresOptions(questionType domain.QuestionType) bool {
	switch questionType {
	case domain.QuestionTypeCheckbox,
		domain.QuestionTypeDropdown,
		domain.QuestionTypeMultiSelect:
		return true
	default:
		return false
	}
}

/*
buildStandupScheduleFromInput validates and builds a standup schedule.
*/
func buildStandupScheduleFromInput(
	workspaceID domain.ID,
	templateID domain.ID,
	scheduleID domain.ID,
	kindValue string,
	enabled bool,
	opensAtValue string,
	timeOfDayValue string,
	skipNonWorkingDays bool,
	weeklyModeValue string,
	skipDailyWhenWeeklyRuns bool,
	createdBy string,
	now time.Time,
) (*domain.StandupSchedule, error) {
	kind := domain.StandupKind(strings.TrimSpace(kindValue))
	if !isValidStandupKind(kind) {
		return nil, NewError(ErrorCodeValidationFailed, "Standup schedule kind is not supported.")
	}

	opensAt, err := parseStandupTimeOfDay(opensAtValue)
	if err != nil {
		return nil, err
	}

	timeOfDay, err := parseStandupTimeOfDay(timeOfDayValue)
	if err != nil {
		return nil, err
	}

	if !standupOpenIsBeforeClose(opensAt, timeOfDay) {
		return nil, NewError(ErrorCodeValidationFailed, "Standup open time must be before the close/report time.")
	}

	weeklyMode := domain.WeeklyMode(strings.TrimSpace(weeklyModeValue))
	if err := validateScheduleWeeklyMode(kind, weeklyMode); err != nil {
		return nil, err
	}

	if kind != domain.StandupKindWeekly {
		weeklyMode = domain.WeeklyModeNone
	}

	// Weekly and daily schedules are independent in Campfire. The legacy
	// skipDailyWhenWeeklyRuns field stays in the API/database only for backward
	// compatibility and must not create runtime coupling.
	skipDailyWhenWeeklyRuns = false

	return &domain.StandupSchedule{
		ID:                      scheduleID,
		WorkspaceID:             workspaceID,
		TemplateID:              templateID,
		Kind:                    kind,
		Enabled:                 enabled,
		OpensAt:                 opensAt,
		TimeOfDay:               timeOfDay,
		SkipNonWorkingDays:      skipNonWorkingDays,
		WeeklyMode:              weeklyMode,
		SkipDailyWhenWeeklyRuns: skipDailyWhenWeeklyRuns,
		CreatedBy:               strings.TrimSpace(createdBy),
		CreatedAt:               now,
		UpdatedAt:               now,
	}, nil
}

/*
parseStandupTimeOfDay validates and returns a standup schedule time.
*/
func parseStandupTimeOfDay(value string) (domain.TimeOfDay, error) {
	cleanValue := strings.TrimSpace(value)
	if cleanValue == "" {
		return "", NewError(ErrorCodeValidationFailed, "Schedule time is required.")
	}

	if _, err := time.Parse("15:04", cleanValue); err != nil {
		return "", NewError(ErrorCodeValidationFailed, "Schedule time must be in HH:mm format.")
	}

	return domain.TimeOfDay(cleanValue), nil
}

/*
standupOpenIsBeforeClose reports whether the configured open time is before the close/report time on the same local day.
*/
func standupOpenIsBeforeClose(opensAt domain.TimeOfDay, closesAt domain.TimeOfDay) bool {
	openTime, openErr := time.Parse("15:04", opensAt.String())
	closeTime, closeErr := time.Parse("15:04", closesAt.String())

	if openErr != nil || closeErr != nil {
		return false
	}

	return openTime.Before(closeTime)
}

/*
validateScheduleWeeklyMode validates weekly-mode settings for a schedule.
*/
func validateScheduleWeeklyMode(kind domain.StandupKind, weeklyMode domain.WeeklyMode) error {
	if kind != domain.StandupKindWeekly {
		return nil
	}

	switch weeklyMode {
	case domain.WeeklyModeLastWorkingDay:
		return nil
	default:
		return NewError(ErrorCodeValidationFailed, "Weekly schedules must use last_working_day mode.")
	}
}

/*
normalizeStandupTemplateName collapses whitespace while preserving the user's
chosen casing. Persisting normalized names prevents UI-only hacks and makes the
workspace-level uniqueness rule predictable.
*/
func normalizeStandupTemplateName(value string) string {
	return strings.Join(strings.Fields(value), " ")
}

/*
listConfigurationTemplates selects active-only or full template collections.
*/
func (s *StandupService) listConfigurationTemplates(
	ctx context.Context,
	workspaceID domain.ID,
	includeInactive bool,
) ([]domain.StandupTemplate, error) {
	if includeInactive {
		return s.standupStore.ListAllTemplatesByWorkspaceID(ctx, workspaceID)
	}

	return s.standupStore.ListTemplatesByWorkspaceID(ctx, workspaceID)
}

/*
listConfigurationQuestions selects active-only or full question collections.
*/
func (s *StandupService) listConfigurationQuestions(
	ctx context.Context,
	workspaceID domain.ID,
	includeInactive bool,
) ([]domain.StandupQuestion, error) {
	if includeInactive {
		return s.standupStore.ListAllQuestionsByWorkspaceID(ctx, workspaceID)
	}

	return s.standupStore.ListQuestionsByWorkspaceID(ctx, workspaceID)
}

/*
loadConfiguration loads standup configuration from the store.
*/
func (s *StandupService) loadConfiguration(
	ctx context.Context,
	workspaceID domain.ID,
	includeInactive bool,
) (*StandupConfiguration, error) {
	templates, err := s.listConfigurationTemplates(ctx, workspaceID, includeInactive)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load standup templates.")
	}

	questions, err := s.listConfigurationQuestions(ctx, workspaceID, includeInactive)
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

/*
buildAnswers validates submitted answers and maps them to domain answers.
*/
func (s *StandupService) buildAnswers(
	workspaceID domain.ID,
	questions []domain.StandupQuestion,
	inputAnswers []SubmitStandupAnswerInput,
) ([]domain.StandupAnswer, error) {
	answersByQuestionID := map[string]SubmitStandupAnswerInput{}
	for _, answer := range inputAnswers {
		cleanQuestionID := strings.TrimSpace(answer.QuestionID)
		if cleanQuestionID == "" {
			return nil, NewError(ErrorCodeValidationFailed, "Answer question ID is required.")
		}

		answersByQuestionID[cleanQuestionID] = answer
	}

	answers := make([]domain.StandupAnswer, 0, len(questions))
	for _, question := range questions {
		inputAnswer, exists := answersByQuestionID[question.ID.String()]
		if !exists {
			if question.Required {
				return nil, NewError(ErrorCodeValidationFailed, "All required standup questions must be answered.")
			}

			continue
		}

		cleanValueJSON := strings.TrimSpace(inputAnswer.ValueJSON)
		if question.Required && isEmptyJSONValue(cleanValueJSON) {
			return nil, NewError(ErrorCodeValidationFailed, "All required standup questions must be answered.")
		}

		if err := validateAnswerJSON(question, cleanValueJSON); err != nil {
			return nil, err
		}

		answers = append(answers, domain.StandupAnswer{
			ID:          domain.ID(uuid.NewString()),
			WorkspaceID: workspaceID,
			QuestionID:  question.ID,
			ValueJSON:   cleanValueJSON,
		})
	}

	return answers, nil
}

/*
validateAnswerJSON validates one submitted answer against its question type.
*/
func validateAnswerJSON(question domain.StandupQuestion, valueJSON string) error {
	var raw json.RawMessage
	if err := json.Unmarshal([]byte(valueJSON), &raw); err != nil {
		return NewError(ErrorCodeValidationFailed, "Standup answer value must be valid JSON.")
	}

	switch question.Type {
	case domain.QuestionTypeText,
		domain.QuestionTypeLongText,
		domain.QuestionTypeWorkItems,
		domain.QuestionTypeDropdown:
		var value string
		if err := json.Unmarshal(raw, &value); err != nil {
			return NewError(ErrorCodeValidationFailed, "Standup answer must be a JSON string.")
		}

		return nil

	case domain.QuestionTypeDate:
		var value string
		if err := json.Unmarshal(raw, &value); err != nil {
			return NewError(ErrorCodeValidationFailed, "Standup answer must be a JSON date string.")
		}

		if strings.TrimSpace(value) == "" {
			return nil
		}

		if _, err := time.Parse("2006-01-02", value); err != nil {
			return NewError(ErrorCodeValidationFailed, "Date answers must use YYYY-MM-DD format.")
		}

		return nil

	case domain.QuestionTypeTime:
		var value string
		if err := json.Unmarshal(raw, &value); err != nil {
			return NewError(ErrorCodeValidationFailed, "Standup answer must be a JSON time string.")
		}

		if strings.TrimSpace(value) == "" {
			return nil
		}

		if _, err := time.Parse("15:04", value); err != nil {
			return NewError(ErrorCodeValidationFailed, "Time answers must use HH:mm format.")
		}

		return nil

	case domain.QuestionTypeDateTime:
		var value string
		if err := json.Unmarshal(raw, &value); err != nil {
			return NewError(ErrorCodeValidationFailed, "Standup answer must be a JSON date-time string.")
		}

		if strings.TrimSpace(value) == "" {
			return nil
		}

		if _, err := time.Parse("2006-01-02T15:04", value); err != nil {
			return NewError(ErrorCodeValidationFailed, "Date-time answers must use YYYY-MM-DDTHH:mm format.")
		}

		return nil

	case domain.QuestionTypeCheckbox, domain.QuestionTypeBoolean:
		var value bool
		if err := json.Unmarshal(raw, &value); err != nil {
			return NewError(ErrorCodeValidationFailed, "Standup answer must be a JSON boolean.")
		}

		return nil

	case domain.QuestionTypeMultiSelect:
		var value []string
		if err := json.Unmarshal(raw, &value); err != nil {
			return NewError(ErrorCodeValidationFailed, "Standup answer must be a JSON string array.")
		}

		return nil

	case domain.QuestionTypeNumber, domain.QuestionTypeDuration:
		var value float64
		if err := json.Unmarshal(raw, &value); err != nil {
			return NewError(ErrorCodeValidationFailed, "Standup answer must be a JSON number.")
		}

		return nil

	default:
		return NewError(ErrorCodeValidationFailed, "Standup question type is not supported.")
	}
}

/*
isEmptyJSONValue returns true when a required JSON answer is effectively empty.
*/
func isEmptyJSONValue(valueJSON string) bool {
	if valueJSON == "" || valueJSON == "null" || valueJSON == `""` || valueJSON == "[]" {
		return true
	}

	return false
}

/*
findTemplate returns a template by ID.
*/
func findTemplate(templates []domain.StandupTemplate, templateID domain.ID) *domain.StandupTemplate {
	for _, template := range templates {
		if template.ID == templateID {
			found := template
			return &found
		}
	}

	return nil
}

/*
findSchedule returns a schedule by ID.
*/
func findSchedule(schedules []domain.StandupSchedule, scheduleID domain.ID) *domain.StandupSchedule {
	for _, schedule := range schedules {
		if schedule.ID == scheduleID {
			found := schedule
			return &found
		}
	}

	return nil
}

/*
questionsForTemplate returns questions belonging to a template.
*/
func questionsForTemplate(
	questions []domain.StandupQuestion,
	templateID domain.ID,
) []domain.StandupQuestion {
	results := []domain.StandupQuestion{}

	for _, question := range questions {
		if question.TemplateID == templateID {
			results = append(results, question)
		}
	}

	return results
}

/*
normalizeStandupSubmissionSortMode returns a supported sort mode.
*/
func normalizeStandupSubmissionSortMode(value string) domain.StandupSubmissionSortMode {
	switch domain.StandupSubmissionSortMode(strings.TrimSpace(value)) {
	case domain.StandupSubmissionSortFirstSubmitted:
		return domain.StandupSubmissionSortFirstSubmitted

	case domain.StandupSubmissionSortLastSubmitted:
		return domain.StandupSubmissionSortLastSubmitted

	case domain.StandupSubmissionSortMissingFirst:
		return domain.StandupSubmissionSortMissingFirst

	default:
		return domain.StandupSubmissionSortName
	}
}

/*
sortStandupSubmissions sorts submissions in place.
*/
func sortStandupSubmissions(
	submissions []domain.StandupSubmissionWithAnswers,
	sortMode domain.StandupSubmissionSortMode,
) {
	sort.SliceStable(submissions, func(firstIndex int, secondIndex int) bool {
		first := submissions[firstIndex].Submission
		second := submissions[secondIndex].Submission

		switch sortMode {
		case domain.StandupSubmissionSortFirstSubmitted:
			if first.FirstSubmittedAt.Equal(second.FirstSubmittedAt) {
				return first.UserID < second.UserID
			}

			return first.FirstSubmittedAt.Before(second.FirstSubmittedAt)

		case domain.StandupSubmissionSortLastSubmitted:
			if first.LastUpdatedAt.Equal(second.LastUpdatedAt) {
				return first.UserID < second.UserID
			}

			return first.LastUpdatedAt.Before(second.LastUpdatedAt)

		default:
			return first.UserID < second.UserID
		}
	})
}

/*
submittedUserIDsFromSubmissions returns unique submitting user IDs.
*/
func submittedUserIDsFromSubmissions(submissions []domain.StandupSubmissionWithAnswers) []string {
	userIDs := make([]string, 0, len(submissions))

	for _, submission := range submissions {
		userIDs = append(userIDs, submission.Submission.UserID)
	}

	return uniqueNonEmptyStrings(userIDs)
}

/*
onLeaveMemberUserIDs returns member user IDs that are on approved leave.
*/
func onLeaveMemberUserIDs(
	memberUserIDs []string,
	onLeaveUserIDSet map[string]bool,
) []string {
	userIDs := []string{}

	for _, userID := range memberUserIDs {
		if onLeaveUserIDSet[userID] {
			userIDs = append(userIDs, userID)
		}
	}

	return userIDs
}

/*
missingStandupUserIDs returns members who have not submitted and are not on approved leave.
*/
func missingStandupUserIDs(
	memberUserIDs []string,
	submittedUserIDs []string,
	onLeaveUserIDs []string,
) []string {
	submittedSet := stringSet(submittedUserIDs)
	onLeaveSet := stringSet(onLeaveUserIDs)
	missing := []string{}

	for _, userID := range memberUserIDs {
		if submittedSet[userID] || onLeaveSet[userID] {
			continue
		}

		missing = append(missing, userID)
	}

	return missing
}

/*
stringSet returns a set for string membership checks.
*/
func stringSet(values []string) map[string]bool {
	set := map[string]bool{}

	for _, value := range values {
		cleanValue := strings.TrimSpace(value)
		if cleanValue != "" {
			set[cleanValue] = true
		}
	}

	return set
}
