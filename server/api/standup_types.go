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
	TimeOfDay               string `json:"timeOfDay"`
	SkipNonWorkingDays      bool   `json:"skipNonWorkingDays"`
	WeeklyMode              string `json:"weeklyMode"`
	SkipDailyWhenWeeklyRuns bool   `json:"skipDailyWhenWeeklyRuns"`
	CreatedBy               string `json:"createdBy"`
	CreatedAt               string `json:"createdAt"`
	UpdatedAt               string `json:"updatedAt"`
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
		TimeOfDay:               schedule.TimeOfDay.String(),
		SkipNonWorkingDays:      schedule.SkipNonWorkingDays,
		WeeklyMode:              string(schedule.WeeklyMode),
		SkipDailyWhenWeeklyRuns: schedule.SkipDailyWhenWeeklyRuns,
		CreatedBy:               schedule.CreatedBy,
		CreatedAt:               formatAPITime(schedule.CreatedAt),
		UpdatedAt:               formatAPITime(schedule.UpdatedAt),
	}
}
