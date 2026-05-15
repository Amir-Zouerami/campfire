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
	ActorUserID string
	WorkspaceID string
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
	Position      int
	Options       []string
}

/*
SubmitStandupResult contains the saved submission and answers.
*/
type SubmitStandupResult struct {
	Submission domain.StandupSubmission
	Answers    []domain.StandupAnswer
}

/*
StandupService owns standup template, schedule, and submission behavior.
*/
type StandupService struct {
	workspaceStore     store.WorkspaceStore
	workspaceRoleStore store.WorkspaceRoleStore
	standupStore       store.StandupStore
	leaveStore         store.LeaveStore
	memberProvider     WorkspaceMemberProvider
}

/*
NewStandupService creates a standup service.
*/
func NewStandupService(
	workspaceStore store.WorkspaceStore,
	workspaceRoleStore store.WorkspaceRoleStore,
	standupStore store.StandupStore,
	leaveStore store.LeaveStore,
	memberProvider WorkspaceMemberProvider,
) *StandupService {
	return &StandupService{
		workspaceStore:     workspaceStore,
		workspaceRoleStore: workspaceRoleStore,
		standupStore:       standupStore,
		leaveStore:         leaveStore,
		memberProvider:     memberProvider,
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

	name := strings.TrimSpace(input.Name)
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
		IsActive:    true,
		CreatedBy:   cleanActorUserID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	created, err := s.standupStore.CreateTemplate(ctx, template)
	if err != nil {
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

	name := strings.TrimSpace(input.Name)
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

		return nil, NewError(ErrorCodeInternal, "Could not update standup template.")
	}

	return updated, nil
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

	configuration, err := s.loadConfiguration(ctx, workspaceID)
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

	memberUserIDs = uniqueNonEmptyStrings(memberUserIDs)
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

		Submissions: submissions,
	}, nil
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
	if _, err := s.workspaceStore.GetByID(ctx, workspaceID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Workspace was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load workspace.")
	}

	configuration, err := s.loadConfiguration(ctx, workspaceID)
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

	return &SubmitStandupResult{
		Submission: result.Submission,
		Answers:    result.Answers,
	}, nil
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
loadConfiguration loads standup configuration from the store.
*/
func (s *StandupService) loadConfiguration(
	ctx context.Context,
	workspaceID domain.ID,
) (*StandupConfiguration, error) {
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
		domain.QuestionTypeDropdown,
		domain.QuestionTypeDuration:
		var value string
		if err := json.Unmarshal(raw, &value); err != nil {
			return NewError(ErrorCodeValidationFailed, "Standup answer must be a JSON string.")
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

	case domain.QuestionTypeNumber:
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
