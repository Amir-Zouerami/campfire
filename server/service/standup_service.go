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
StandupConfiguration contains templates, questions, and schedules for a workspace.
*/
type StandupConfiguration struct {
	Templates []domain.StandupTemplate
	Questions []domain.StandupQuestion
	Schedules []domain.StandupSchedule
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

	configuration, err := s.loadConfiguration(ctx, workspaceID)
	if err != nil {
		return nil, err
	}

	return configuration, nil
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
