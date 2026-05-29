package service

import (
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/store"
	"github.com/google/uuid"
)

const (
	emptyQuestionOptionsJSON = "[]"

	defaultDailyStandupTime  = "09:00"
	defaultWeeklySummaryTime = "16:00"

	defaultDailyReminderOffsetsJSON  = "[0,30,45,55]"
	defaultWeeklyReminderOffsetsJSON = "[0]"
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

All default leave types require approval for Campfire MVP, including Remote/WFH.
Notification behavior will be implemented in the leave workflow and scheduler
layers, not inside seed construction.
*/
func buildDefaultLeaveTypes(workspaceID domain.ID, createdBy string, now time.Time) []domain.LeaveType {
	return []domain.LeaveType{
		buildLeaveType(workspaceID, createdBy, now, "Vacation", "vacation", "#f97316"),
		buildLeaveType(workspaceID, createdBy, now, "Sick", "sick", "#ef4444"),
		buildLeaveType(workspaceID, createdBy, now, "Personal", "personal", "#f59e0b"),
		buildLeaveType(workspaceID, createdBy, now, "Remote/WFH", "remote_wfh", "#38bdf8"),
		buildLeaveType(workspaceID, createdBy, now, "Custom", "custom", "#a78bfa"),
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
	now time.Time,
) DefaultWorkspaceSetup {
	dailyTemplateID := domain.ID(uuid.NewString())
	weeklyTemplateID := domain.ID(uuid.NewString())
	dailyScheduleID := domain.ID(uuid.NewString())
	weeklyScheduleID := domain.ID(uuid.NewString())

	return DefaultWorkspaceSetup{
		Templates: []store.CreateStandupTemplateParams{
			buildDefaultDailyTemplate(workspaceID, dailyTemplateID, createdBy, now),
			buildDefaultWeeklyTemplate(workspaceID, weeklyTemplateID, createdBy, now),
		},
		Schedules: []domain.StandupSchedule{
			{
				ID:                      dailyScheduleID,
				WorkspaceID:             workspaceID,
				TemplateID:              dailyTemplateID,
				Kind:                    domain.StandupKindDaily,
				Enabled:                 true,
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
				PreviewRequired: true,
				SortMode:        domain.ReportSortBlockersFirst,
				ReportLanguage:  domain.ReportLanguageEnglish,
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
				PreviewRequired: true,
				SortMode:        domain.ReportSortBlockersFirst,
				ReportLanguage:  domain.ReportLanguageEnglish,
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
*/
func buildDefaultDailyTemplate(
	workspaceID domain.ID,
	templateID domain.ID,
	createdBy string,
	now time.Time,
) store.CreateStandupTemplateParams {
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
		Questions: []domain.StandupQuestion{
			buildStandupQuestion(
				templateID,
				workspaceID,
				now,
				1,
				"Progress",
				"Yesterday / Progress",
				"What did you finish or make progress on?",
				"Finished login refactor, reviewed dashboard PRs...",
				domain.QuestionLongText,
				true,
				true,
				true,
			),
			buildStandupQuestion(
				templateID,
				workspaceID,
				now,
				2,
				"Plan",
				"Today / Plan",
				"What are you focusing on next?",
				"Continue dashboard work, pair on API contract...",
				domain.QuestionLongText,
				true,
				true,
				true,
			),
			buildStandupQuestion(
				templateID,
				workspaceID,
				now,
				3,
				"Blockers",
				"Blockers",
				"Anything blocking you?",
				"Waiting on API contract...",
				domain.QuestionLongText,
				false,
				true,
				false,
			),
		},
	}
}

/*
buildDefaultWeeklyTemplate creates the default weekly summary template.
*/
func buildDefaultWeeklyTemplate(
	workspaceID domain.ID,
	templateID domain.ID,
	createdBy string,
	now time.Time,
) store.CreateStandupTemplateParams {
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
		Questions: []domain.StandupQuestion{
			buildStandupQuestion(
				templateID,
				workspaceID,
				now,
				1,
				"Weekly Wins",
				"What did you complete this week?",
				"Summarize the meaningful outcomes from this week.",
				"Shipped onboarding improvements, reduced flaky tests...",
				domain.QuestionLongText,
				true,
				true,
				false,
			),
			buildStandupQuestion(
				templateID,
				workspaceID,
				now,
				2,
				"Next Week",
				"What are your priorities next week?",
				"Share the most important focus areas for next week.",
				"Finish reporting filters, polish leave calendar...",
				domain.QuestionLongText,
				true,
				true,
				false,
			),
			buildStandupQuestion(
				templateID,
				workspaceID,
				now,
				3,
				"Risks",
				"Any blockers or risks?",
				"Share risks, dependencies, or things leadership should know.",
				"Release timing depends on security review...",
				domain.QuestionLongText,
				false,
				true,
				false,
			),
		},
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
	section string,
	label string,
	helpText string,
	placeholder string,
	questionType domain.QuestionType,
	required bool,
	showInReport bool,
	createsTasks bool,
) domain.StandupQuestion {
	return domain.StandupQuestion{
		ID:           domain.ID(uuid.NewString()),
		TemplateID:   templateID,
		WorkspaceID:  workspaceID,
		Section:      section,
		Label:        label,
		HelpText:     helpText,
		Placeholder:  placeholder,
		Type:         questionType,
		Required:     required,
		ShowInReport: showInReport,
		IsPrivate:    false,
		CreatesTasks: createsTasks,
		Position:     position,
		OptionsJSON:  emptyQuestionOptionsJSON,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
}
