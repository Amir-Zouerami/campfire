package api

import (
	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/service"
)

/*
StandupTemplatePayload is the API representation of a standup template.
*/
type StandupTemplatePayload struct {
	ID          string `json:"id"`
	WorkspaceID string `json:"workspaceId"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Kind        string `json:"kind"`
	IsDefault   bool   `json:"isDefault"`
	IsActive    bool   `json:"isActive"`
	CreatedBy   string `json:"createdBy"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

/*
StandupQuestionPayload is the API representation of a standup question.
*/
type StandupQuestionPayload struct {
	ID           string   `json:"id"`
	WorkspaceID  string   `json:"workspaceId"`
	TemplateID   string   `json:"templateId"`
	Section      string   `json:"section"`
	QuestionKey  string   `json:"questionKey"`
	Label        string   `json:"label"`
	Prompt       string   `json:"prompt"`
	HelpText     string   `json:"helpText"`
	Placeholder  string   `json:"placeholder"`
	Type         string   `json:"type"`
	Required     bool     `json:"required"`
	ShowInReport bool     `json:"showInReport"`
	IsPrivate    bool     `json:"isPrivate"`
	CreatesTasks bool     `json:"createsTasks"`
	Position     int      `json:"position"`
	Options      []string `json:"options"`
	CreatedAt    string   `json:"createdAt"`
	UpdatedAt    string   `json:"updatedAt"`
}

/*
StandupSchedulePayload is the API representation of a standup schedule.
*/
type StandupSchedulePayload struct {
	ID                      string `json:"id"`
	WorkspaceID             string `json:"workspaceId"`
	TemplateID              string `json:"templateId"`
	Kind                    string `json:"kind"`
	Enabled                 bool   `json:"enabled"`
	OpensAt                 string `json:"opensAt"`
	TimeOfDay               string `json:"timeOfDay"`
	SkipNonWorkingDays      bool   `json:"skipNonWorkingDays"`
	WeeklyMode              string `json:"weeklyMode"`
	SkipDailyWhenWeeklyRuns bool   `json:"skipDailyWhenWeeklyRuns"`
	CreatedBy               string `json:"createdBy"`
	CreatedAt               string `json:"createdAt"`
	UpdatedAt               string `json:"updatedAt"`
}

/*
StandupSubmissionPayload is the API representation of a standup submission.
*/
type StandupSubmissionPayload struct {
	ID               string `json:"id"`
	WorkspaceID      string `json:"workspaceId"`
	TemplateID       string `json:"templateId"`
	ScheduleID       string `json:"scheduleId"`
	UserID           string `json:"userId"`
	OccurrenceDate   string `json:"occurrenceDate"`
	FirstSubmittedAt string `json:"firstSubmittedAt"`
	LastUpdatedAt    string `json:"lastUpdatedAt"`
	Status           string `json:"status"`
	CreatedAt        string `json:"createdAt"`
	UpdatedAt        string `json:"updatedAt"`
}

/*
StandupAnswerPayload is the API representation of a standup answer.
*/
type StandupAnswerPayload struct {
	ID           string `json:"id"`
	SubmissionID string `json:"submissionId"`
	WorkspaceID  string `json:"workspaceId"`
	QuestionID   string `json:"questionId"`
	ValueJSON    string `json:"valueJson"`
	CreatedAt    string `json:"createdAt"`
	UpdatedAt    string `json:"updatedAt"`
}

/*
StandupSubmissionWithAnswersPayload is the API representation of a submission with answers.
*/
type StandupSubmissionWithAnswersPayload struct {
	Submission StandupSubmissionPayload `json:"submission"`
	Answers    []StandupAnswerPayload   `json:"answers"`
}

/*
SubmitStandupAnswerRequest is one submitted standup answer.
*/
type SubmitStandupAnswerRequest struct {
	QuestionID string `json:"questionId"`
	ValueJSON  string `json:"valueJson"`
}

/*
SubmitStandupRequest is accepted by POST /standups/submissions.
*/
type SubmitStandupRequest struct {
	WorkspaceID    string                       `json:"workspaceId"`
	TemplateID     string                       `json:"templateId"`
	ScheduleID     string                       `json:"scheduleId"`
	OccurrenceDate string                       `json:"occurrenceDate"`
	Answers        []SubmitStandupAnswerRequest `json:"answers"`
}

/*
ListStandupConfigurationResponse is returned by GET /workspaces/{workspaceID}/standups/configuration.
*/
type ListStandupConfigurationResponse struct {
	Templates []StandupTemplatePayload `json:"templates"`
	Questions []StandupQuestionPayload `json:"questions"`
	Schedules []StandupSchedulePayload `json:"schedules"`
}

/*
CreateStandupTemplateRequest is accepted by POST /workspaces/{workspaceID}/standups/templates.
*/
type CreateStandupTemplateRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Kind        string `json:"kind"`
	IsActive    *bool  `json:"isActive,omitempty"`
}

/*
CreateStandupTemplateResponse is returned by POST /workspaces/{workspaceID}/standups/templates.
*/
type CreateStandupTemplateResponse struct {
	Template StandupTemplatePayload `json:"template"`
}

/*
UpdateStandupTemplateRequest is accepted by PUT /workspaces/{workspaceID}/standups/templates/{templateID}.
*/
type UpdateStandupTemplateRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Kind        string `json:"kind"`
	IsActive    bool   `json:"isActive"`
}

/*
UpdateStandupTemplateResponse is returned by PUT /workspaces/{workspaceID}/standups/templates/{templateID}.
*/
type UpdateStandupTemplateResponse struct {
	Template StandupTemplatePayload `json:"template"`
}

/*
CreateStandupQuestionRequest is accepted by POST /workspaces/{workspaceID}/standups/questions.
*/
type CreateStandupQuestionRequest struct {
	TemplateID   string   `json:"templateId"`
	Section      string   `json:"section"`
	Label        string   `json:"label"`
	HelpText     string   `json:"helpText"`
	Placeholder  string   `json:"placeholder"`
	Type         string   `json:"type"`
	Required     bool     `json:"required"`
	ShowInReport bool     `json:"showInReport"`
	IsPrivate    bool     `json:"isPrivate"`
	CreatesTasks bool     `json:"createsTasks"`
	Position     int      `json:"position"`
	Options      []string `json:"options"`
}

/*
CreateStandupQuestionResponse is returned by POST /workspaces/{workspaceID}/standups/questions.
*/
type CreateStandupQuestionResponse struct {
	Question StandupQuestionPayload `json:"question"`
}

/*
UpdateStandupQuestionRequest is accepted by PUT /workspaces/{workspaceID}/standups/questions/{questionID}.
*/
type UpdateStandupQuestionRequest struct {
	TemplateID   string   `json:"templateId"`
	Section      string   `json:"section"`
	Label        string   `json:"label"`
	HelpText     string   `json:"helpText"`
	Placeholder  string   `json:"placeholder"`
	Type         string   `json:"type"`
	Required     bool     `json:"required"`
	ShowInReport bool     `json:"showInReport"`
	IsPrivate    bool     `json:"isPrivate"`
	CreatesTasks bool     `json:"createsTasks"`
	Position     int      `json:"position"`
	Options      []string `json:"options"`
}

/*
UpdateStandupQuestionResponse is returned by PUT /workspaces/{workspaceID}/standups/questions/{questionID}.
*/
type UpdateStandupQuestionResponse struct {
	Question StandupQuestionPayload `json:"question"`
}

/*
CreateStandupScheduleRequest is accepted by POST /workspaces/{workspaceID}/standups/schedules.
*/
type CreateStandupScheduleRequest struct {
	TemplateID              string `json:"templateId"`
	Kind                    string `json:"kind"`
	Enabled                 bool   `json:"enabled"`
	OpensAt                 string `json:"opensAt"`
	TimeOfDay               string `json:"timeOfDay"`
	SkipNonWorkingDays      bool   `json:"skipNonWorkingDays"`
	WeeklyMode              string `json:"weeklyMode"`
	SkipDailyWhenWeeklyRuns bool   `json:"skipDailyWhenWeeklyRuns"`
}

/*
CreateStandupScheduleResponse is returned by POST /workspaces/{workspaceID}/standups/schedules.
*/
type CreateStandupScheduleResponse struct {
	Schedule StandupSchedulePayload `json:"schedule"`
}

/*
UpdateStandupScheduleRequest is accepted by PUT /workspaces/{workspaceID}/standups/schedules/{scheduleID}.
*/
type UpdateStandupScheduleRequest struct {
	TemplateID              string `json:"templateId"`
	Kind                    string `json:"kind"`
	Enabled                 bool   `json:"enabled"`
	OpensAt                 string `json:"opensAt"`
	TimeOfDay               string `json:"timeOfDay"`
	SkipNonWorkingDays      bool   `json:"skipNonWorkingDays"`
	WeeklyMode              string `json:"weeklyMode"`
	SkipDailyWhenWeeklyRuns bool   `json:"skipDailyWhenWeeklyRuns"`
}

/*
UpdateStandupScheduleResponse is returned by PUT /workspaces/{workspaceID}/standups/schedules/{scheduleID}.
*/
type UpdateStandupScheduleResponse struct {
	Schedule StandupSchedulePayload `json:"schedule"`
}

/*
ListStandupSubmissionsResponse is returned by GET /workspaces/{workspaceID}/standups/submissions.
*/
type ListStandupSubmissionsResponse struct {
	WorkspaceID    string `json:"workspaceId"`
	OccurrenceDate string `json:"occurrenceDate"`
	SortMode       string `json:"sortMode"`

	MemberUserIDs    []string `json:"memberUserIds"`
	SubmittedUserIDs []string `json:"submittedUserIds"`
	MissingUserIDs   []string `json:"missingUserIds"`
	OnLeaveUserIDs   []string `json:"onLeaveUserIds"`

	Submissions []StandupSubmissionWithAnswersPayload `json:"submissions"`
}

/*
GetMyStandupSubmissionResponse is returned by GET /workspaces/{workspaceID}/standups/my-submission.
*/
type GetMyStandupSubmissionResponse struct {
	Submission *StandupSubmissionPayload `json:"submission"`
	Answers    []StandupAnswerPayload    `json:"answers"`
}

/*
SubmitStandupResponse is returned by POST /standups/submissions.
*/
type SubmitStandupResponse struct {
	Submission   StandupSubmissionPayload `json:"submission"`
	Answers      []StandupAnswerPayload   `json:"answers"`
	CreatedTasks []TaskPayload            `json:"createdTasks"`
}

/*
StandupConfigurationToPayload maps standup configuration to an API response.
*/
func StandupConfigurationToPayload(
	configuration service.StandupConfiguration,
) ListStandupConfigurationResponse {
	return ListStandupConfigurationResponse{
		Templates: StandupTemplatesToPayload(configuration.Templates),
		Questions: StandupQuestionsToPayload(configuration.Questions),
		Schedules: StandupSchedulesToPayload(configuration.Schedules),
	}
}

/*
ToServiceInput maps an API standup submission request to service input.
*/
func (r SubmitStandupRequest) ToServiceInput(actorUserID string) service.SubmitStandupInput {
	answers := make([]service.SubmitStandupAnswerInput, 0, len(r.Answers))
	for _, answer := range r.Answers {
		answers = append(answers, service.SubmitStandupAnswerInput{
			QuestionID: answer.QuestionID,
			ValueJSON:  answer.ValueJSON,
		})
	}

	return service.SubmitStandupInput{
		ActorUserID:    actorUserID,
		WorkspaceID:    r.WorkspaceID,
		TemplateID:     r.TemplateID,
		ScheduleID:     r.ScheduleID,
		OccurrenceDate: r.OccurrenceDate,
		Answers:        answers,
	}
}

/*
StandupSubmissionToPayload maps a domain submission to its API representation.
*/
func StandupSubmissionToPayload(submission domain.StandupSubmission) StandupSubmissionPayload {
	return StandupSubmissionPayload{
		ID:               submission.ID.String(),
		WorkspaceID:      submission.WorkspaceID.String(),
		TemplateID:       submission.TemplateID.String(),
		ScheduleID:       submission.ScheduleID.String(),
		UserID:           submission.UserID,
		OccurrenceDate:   submission.OccurrenceDate.String(),
		FirstSubmittedAt: formatAPITime(submission.FirstSubmittedAt),
		LastUpdatedAt:    formatAPITime(submission.LastUpdatedAt),
		Status:           string(submission.Status),
		CreatedAt:        formatAPITime(submission.CreatedAt),
		UpdatedAt:        formatAPITime(submission.UpdatedAt),
	}
}

/*
StandupAnswersToPayload maps standup answers to API payloads.
*/
func StandupAnswersToPayload(answers []domain.StandupAnswer) []StandupAnswerPayload {
	payloads := make([]StandupAnswerPayload, 0, len(answers))

	for _, answer := range answers {
		payloads = append(payloads, StandupAnswerToPayload(answer))
	}

	return payloads
}

/*
MyStandupSubmissionToPayload maps a nullable current-user standup row to an API
response. A nil row means the user has not submitted for that date/template yet.
*/
func MyStandupSubmissionToPayload(
	submission *domain.StandupSubmissionWithAnswers,
) GetMyStandupSubmissionResponse {
	if submission == nil {
		return GetMyStandupSubmissionResponse{
			Submission: nil,
			Answers:    []StandupAnswerPayload{},
		}
	}

	payload := StandupSubmissionToPayload(submission.Submission)

	return GetMyStandupSubmissionResponse{
		Submission: &payload,
		Answers:    StandupAnswersToPayload(submission.Answers),
	}
}

/*
StandupOccurrenceSummaryToPayload maps a service occurrence summary to an API response.
*/
func StandupOccurrenceSummaryToPayload(
	summary service.StandupOccurrenceSummary,
) ListStandupSubmissionsResponse {
	return ListStandupSubmissionsResponse{
		WorkspaceID:    summary.WorkspaceID,
		OccurrenceDate: summary.OccurrenceDate,
		SortMode:       string(summary.SortMode),

		MemberUserIDs:    summary.MemberUserIDs,
		SubmittedUserIDs: summary.SubmittedUserIDs,
		MissingUserIDs:   summary.MissingUserIDs,
		OnLeaveUserIDs:   summary.OnLeaveUserIDs,

		Submissions: StandupSubmissionsWithAnswersToPayload(summary.Submissions),
	}
}

/*
StandupSubmissionsWithAnswersToPayload maps submission rows to API payloads.
*/
func StandupSubmissionsWithAnswersToPayload(
	submissions []domain.StandupSubmissionWithAnswers,
) []StandupSubmissionWithAnswersPayload {
	payloads := make([]StandupSubmissionWithAnswersPayload, 0, len(submissions))

	for _, submission := range submissions {
		payloads = append(payloads, StandupSubmissionWithAnswersPayload{
			Submission: StandupSubmissionToPayload(submission.Submission),
			Answers:    StandupAnswersToPayload(submission.Answers),
		})
	}

	return payloads
}

/*
StandupAnswerToPayload maps a standup answer to its API representation.
*/
func StandupAnswerToPayload(answer domain.StandupAnswer) StandupAnswerPayload {
	return StandupAnswerPayload{
		ID:           answer.ID.String(),
		SubmissionID: answer.SubmissionID.String(),
		WorkspaceID:  answer.WorkspaceID.String(),
		QuestionID:   answer.QuestionID.String(),
		ValueJSON:    answer.ValueJSON,
		CreatedAt:    formatAPITime(answer.CreatedAt),
		UpdatedAt:    formatAPITime(answer.UpdatedAt),
	}
}

/*
StandupTemplatesToPayload maps standup templates to API payloads.
*/
func StandupTemplatesToPayload(templates []domain.StandupTemplate) []StandupTemplatePayload {
	payloads := make([]StandupTemplatePayload, 0, len(templates))

	for _, template := range templates {
		payloads = append(payloads, StandupTemplateToPayload(template))
	}

	return payloads
}

/*
StandupTemplateToPayload maps a standup template to its API representation.
*/
func StandupTemplateToPayload(template domain.StandupTemplate) StandupTemplatePayload {
	return StandupTemplatePayload{
		ID:          template.ID.String(),
		WorkspaceID: template.WorkspaceID.String(),
		Name:        template.Name,
		Description: template.Description,
		Kind:        string(template.Kind),
		IsDefault:   template.IsDefault,
		IsActive:    template.IsActive,
		CreatedBy:   template.CreatedBy,
		CreatedAt:   formatAPITime(template.CreatedAt),
		UpdatedAt:   formatAPITime(template.UpdatedAt),
	}
}

/*
StandupQuestionsToPayload maps standup questions to API payloads.
*/
func StandupQuestionsToPayload(questions []domain.StandupQuestion) []StandupQuestionPayload {
	payloads := make([]StandupQuestionPayload, 0, len(questions))

	for _, question := range questions {
		payloads = append(payloads, StandupQuestionToPayload(question))
	}

	return payloads
}

/*
StandupQuestionToPayload maps a standup question to its API representation.
*/
func StandupQuestionToPayload(question domain.StandupQuestion) StandupQuestionPayload {
	return StandupQuestionPayload{
		ID:           question.ID.String(),
		WorkspaceID:  question.WorkspaceID.String(),
		TemplateID:   question.TemplateID.String(),
		Section:      question.Section,
		QuestionKey:  question.QuestionKey,
		Label:        question.Label,
		Prompt:       question.Prompt,
		HelpText:     question.HelpText,
		Placeholder:  question.Placeholder,
		Type:         string(question.Type),
		Required:     question.Required,
		ShowInReport: question.ShowInReport,
		IsPrivate:    question.IsPrivate,
		CreatesTasks: question.CreatesTasks,
		Position:     question.Position,
		Options:      question.Options,
		CreatedAt:    formatAPITime(question.CreatedAt),
		UpdatedAt:    formatAPITime(question.UpdatedAt),
	}
}

/*
StandupSchedulesToPayload maps standup schedules to API payloads.
*/
func StandupSchedulesToPayload(schedules []domain.StandupSchedule) []StandupSchedulePayload {
	payloads := make([]StandupSchedulePayload, 0, len(schedules))

	for _, schedule := range schedules {
		payloads = append(payloads, StandupScheduleToPayload(schedule))
	}

	return payloads
}

/*
StandupScheduleToPayload maps a standup schedule to its API representation.
*/
func StandupScheduleToPayload(schedule domain.StandupSchedule) StandupSchedulePayload {
	return StandupSchedulePayload{
		ID:                      schedule.ID.String(),
		WorkspaceID:             schedule.WorkspaceID.String(),
		TemplateID:              schedule.TemplateID.String(),
		Kind:                    string(schedule.Kind),
		Enabled:                 schedule.Enabled,
		OpensAt:                 schedule.OpensAt.String(),
		TimeOfDay:               schedule.TimeOfDay.String(),
		SkipNonWorkingDays:      schedule.SkipNonWorkingDays,
		WeeklyMode:              string(schedule.WeeklyMode),
		SkipDailyWhenWeeklyRuns: schedule.SkipDailyWhenWeeklyRuns,
		CreatedBy:               schedule.CreatedBy,
		CreatedAt:               formatAPITime(schedule.CreatedAt),
		UpdatedAt:               formatAPITime(schedule.UpdatedAt),
	}
}
