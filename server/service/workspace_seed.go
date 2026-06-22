package service

import (
	"encoding/json"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/i18n"
	"github.com/amir-zouerami/campfire/server/store"
	"github.com/google/uuid"
)

const (
	emptyQuestionOptionsJSON = "[]"

	defaultDailyStandupOpenTime  = "09:30"
	defaultDailyStandupTime      = "10:00"
	defaultWeeklySummaryOpenTime = "15:30"
	defaultWeeklySummaryTime     = "16:00"

	defaultDailyReminderOffsetsJSON  = "[15,25]"
	defaultWeeklyReminderOffsetsJSON = "[15]"
)

/*
DefaultWorkspaceSetup contains seeded workspace automation data.
*/
type DefaultWorkspaceSetup struct {
	Templates []store.CreateStandupTemplateParams
	Schedules []domain.StandupSchedule
	Reminders []domain.ReminderRule
	Reports   []domain.ReportRule
}

/*
buildDefaultLeaveTypes creates the default workspace leave types.

All default leave types require approval for Campfire MVP, including WFH/Remote.
Notification behavior will be implemented in the leave workflow and scheduler
layers, not inside seed construction.
*/
func buildDefaultLeaveTypes(workspaceID domain.ID, createdBy string, now time.Time) []domain.LeaveType {
	return []domain.LeaveType{
		buildLeaveType(workspaceID, createdBy, now, "Sick", "sick", "#ef4444"),
		buildLeaveType(workspaceID, createdBy, now, "Personal", "personal", "#f59e0b"),
		buildLeaveType(workspaceID, createdBy, now, "WFH/Remote", "remote_wfh", "#38bdf8"),
	}
}

/*
buildLeaveType creates one active approval-required leave type.
*/
func buildLeaveType(
	workspaceID domain.ID,
	createdBy string,
	now time.Time,
	name string,
	code string,
	color string,
) domain.LeaveType {
	return domain.LeaveType{
		ID:               domain.ID(uuid.NewString()),
		WorkspaceID:      workspaceID,
		Name:             name,
		Code:             code,
		Color:            color,
		RequiresApproval: true,
		IsActive:         true,
		CreatedBy:        createdBy,
		CreatedAt:        now,
		UpdatedAt:        now,
	}
}

/*
buildDefaultWorkspaceSetup creates Campfire's default standup templates,
schedules, reminder windows, and report rules.
*/
func buildDefaultWorkspaceSetup(
	workspaceID domain.ID,
	createdBy string,
	language domain.Language,
	now time.Time,
) DefaultWorkspaceSetup {
	dailyTemplateID := domain.ID(uuid.NewString())
	weeklyTemplateID := domain.ID(uuid.NewString())
	dailyScheduleID := domain.ID(uuid.NewString())
	weeklyScheduleID := domain.ID(uuid.NewString())

	return DefaultWorkspaceSetup{
		Templates: []store.CreateStandupTemplateParams{
			buildDefaultDailyTemplate(workspaceID, dailyTemplateID, createdBy, language, now),
			buildDefaultWeeklyTemplate(workspaceID, weeklyTemplateID, createdBy, language, now),
		},
		Schedules: []domain.StandupSchedule{
			{
				ID:                      dailyScheduleID,
				WorkspaceID:             workspaceID,
				TemplateID:              dailyTemplateID,
				Kind:                    domain.StandupKindDaily,
				Enabled:                 true,
				OpensAt:                 domain.TimeOfDay(defaultDailyStandupOpenTime),
				TimeOfDay:               domain.TimeOfDay(defaultDailyStandupTime),
				SkipNonWorkingDays:      true,
				WeeklyMode:              "",
				SkipDailyWhenWeeklyRuns: false,
				CreatedBy:               createdBy,
				CreatedAt:               now,
				UpdatedAt:               now,
			},
			{
				ID:                      weeklyScheduleID,
				WorkspaceID:             workspaceID,
				TemplateID:              weeklyTemplateID,
				Kind:                    domain.StandupKindWeekly,
				Enabled:                 true,
				OpensAt:                 domain.TimeOfDay(defaultWeeklySummaryOpenTime),
				TimeOfDay:               domain.TimeOfDay(defaultWeeklySummaryTime),
				SkipNonWorkingDays:      true,
				WeeklyMode:              domain.WeeklyModeLastWorkingDay,
				SkipDailyWhenWeeklyRuns: false,
				CreatedBy:               createdBy,
				CreatedAt:               now,
				UpdatedAt:               now,
			},
		},
		Reminders: []domain.ReminderRule{
			{
				ID:                      domain.ID(uuid.NewString()),
				WorkspaceID:             workspaceID,
				ScheduleID:              dailyScheduleID,
				Enabled:                 true,
				ChannelReminderEnabled:  true,
				DMReminderEnabled:       true,
				ReminderOffsetsJSON:     defaultDailyReminderOffsetsJSON,
				MentionMissingInChannel: true,
				CreatedBy:               createdBy,
				CreatedAt:               now,
				UpdatedAt:               now,
			},
			{
				ID:                      domain.ID(uuid.NewString()),
				WorkspaceID:             workspaceID,
				ScheduleID:              weeklyScheduleID,
				Enabled:                 true,
				ChannelReminderEnabled:  true,
				DMReminderEnabled:       true,
				ReminderOffsetsJSON:     defaultWeeklyReminderOffsetsJSON,
				MentionMissingInChannel: true,
				CreatedBy:               createdBy,
				CreatedAt:               now,
				UpdatedAt:               now,
			},
		},
		Reports: []domain.ReportRule{
			{
				ID:              domain.ID(uuid.NewString()),
				WorkspaceID:     workspaceID,
				ScheduleID:      dailyScheduleID,
				Enabled:         true,
				ReportKind:      domain.ReportKindDaily,
				PostToChannel:   true,
				PreviewRequired: false,
				SortMode:        domain.ReportSortFirstSubmitted,
				ReportLanguage:  language,
				IncludeOnLeave:  true,
				IncludeMissing:  true,
				IncludeTime:     false,
				IncludeBlockers: true,
				CreatedBy:       createdBy,
				CreatedAt:       now,
				UpdatedAt:       now,
			},
			{
				ID:              domain.ID(uuid.NewString()),
				WorkspaceID:     workspaceID,
				ScheduleID:      weeklyScheduleID,
				Enabled:         true,
				ReportKind:      domain.ReportKindWeekly,
				PostToChannel:   true,
				PreviewRequired: false,
				SortMode:        domain.ReportSortFirstSubmitted,
				ReportLanguage:  language,
				IncludeOnLeave:  true,
				IncludeMissing:  true,
				IncludeTime:     true,
				IncludeBlockers: true,
				CreatedBy:       createdBy,
				CreatedAt:       now,
				UpdatedAt:       now,
			},
		},
	}
}

/*
buildDefaultDailyTemplate creates the default daily standup template.

Default templates and questions are plain seeded rows. They do not receive any
special runtime behavior and can be edited or deleted like administrator-created
forms.
*/
func buildDefaultDailyTemplate(
	workspaceID domain.ID,
	templateID domain.ID,
	createdBy string,
	language domain.Language,
	now time.Time,
) store.CreateStandupTemplateParams {
	questionCopies := i18n.DefaultDailyStandupQuestions(language)
	questions := make([]domain.StandupQuestion, 0, len(questionCopies))

	for index, copy := range questionCopies {
		questionType := domain.QuestionLongText
		if index < 2 {
			questionType = domain.QuestionWorkItems
		}

		options := []string{}
		required := index < 2

		if index == 3 {
			questionType = domain.QuestionBoolean
			options = []string{
				i18n.Translate(language, i18n.MessageNo),
				i18n.Translate(language, i18n.MessageYes),
			}
			required = true
		}

		questions = append(questions, buildStandupQuestion(
			templateID,
			workspaceID,
			now,
			index+1,
			copy,
			questionType,
			required,
			true,
			false,
			options,
		))
	}

	return store.CreateStandupTemplateParams{
		Template: domain.StandupTemplate{
			ID:          templateID,
			WorkspaceID: workspaceID,
			Name:        "Daily Standup",
			Description: "Default Campfire daily check-in.",
			Kind:        domain.StandupKindDaily,
			IsActive:    true,
			CreatedBy:   createdBy,
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		Questions: questions,
	}
}

/*
buildDefaultWeeklyTemplate creates the default weekly summary template.

The weekly seed is independent from the daily seed. It only creates normal
weekly-template rows and never suppresses daily standups.
*/
func buildDefaultWeeklyTemplate(
	workspaceID domain.ID,
	templateID domain.ID,
	createdBy string,
	language domain.Language,
	now time.Time,
) store.CreateStandupTemplateParams {
	questionCopies := i18n.DefaultWeeklyStandupQuestions(language)
	questions := make([]domain.StandupQuestion, 0, len(questionCopies))

	for index, copy := range questionCopies {
		questions = append(questions, buildStandupQuestion(
			templateID,
			workspaceID,
			now,
			index+1,
			copy,
			domain.QuestionLongText,
			index < 2,
			true,
			false,
			[]string{},
		))
	}

	return store.CreateStandupTemplateParams{
		Template: domain.StandupTemplate{
			ID:          templateID,
			WorkspaceID: workspaceID,
			Name:        "Weekly Summary",
			Description: "Default Campfire weekly summary.",
			Kind:        domain.StandupKindWeekly,
			IsActive:    true,
			CreatedBy:   createdBy,
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		Questions: questions,
	}
}

/*
buildStandupQuestion creates a default standup question.
*/
func buildStandupQuestion(
	templateID domain.ID,
	workspaceID domain.ID,
	now time.Time,
	position int,
	copy i18n.StandupQuestionCopy,
	questionType domain.QuestionType,
	required bool,
	showInReport bool,
	createsTasks bool,
	options []string,
) domain.StandupQuestion {
	return domain.StandupQuestion{
		ID:           domain.ID(uuid.NewString()),
		TemplateID:   templateID,
		WorkspaceID:  workspaceID,
		Section:      copy.Section,
		Label:        copy.Label,
		HelpText:     copy.HelpText,
		Placeholder:  copy.Placeholder,
		Type:         questionType,
		Required:     required,
		ShowInReport: showInReport,
		IsPrivate:    false,
		CreatesTasks: createsTasks,
		Position:     position,
		OptionsJSON:  standupQuestionOptionsJSON(options),
		CreatedAt:    now,
		UpdatedAt:    now,
	}
}

/*
standupQuestionOptionsJSON serializes default question options.

Seed failures should not be possible for a static string slice, but keeping a
small defensive fallback prevents workspace creation from failing because of an
options serialization edge case.
*/
func standupQuestionOptionsJSON(options []string) string {
	if len(options) == 0 {
		return emptyQuestionOptionsJSON
	}

	encoded, err := json.Marshal(options)
	if err != nil {
		return emptyQuestionOptionsJSON
	}

	return string(encoded)
}
