package service

import (
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/store"
	"github.com/google/uuid"
)

const emptyQuestionOptionsJSON = "[]"

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
buildDefaultStandupTemplates creates Campfire's default daily and weekly templates.

Task creation remains a separate UI section, not a special question type. This
keeps the dynamic form builder simple while still supporting task/time workflows.
*/
func buildDefaultStandupTemplates(
	workspaceID domain.ID,
	createdBy string,
	now time.Time,
) []store.CreateStandupTemplateParams {
	dailyTemplateID := domain.ID(uuid.NewString())
	weeklyTemplateID := domain.ID(uuid.NewString())

	return []store.CreateStandupTemplateParams{
		{
			Template: domain.StandupTemplate{
				ID:          dailyTemplateID,
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
					dailyTemplateID,
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
				),
				buildStandupQuestion(
					dailyTemplateID,
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
				),
				buildStandupQuestion(
					dailyTemplateID,
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
				),
			},
		},
		{
			Template: domain.StandupTemplate{
				ID:          weeklyTemplateID,
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
					weeklyTemplateID,
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
				),
				buildStandupQuestion(
					weeklyTemplateID,
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
				),
				buildStandupQuestion(
					weeklyTemplateID,
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
				),
			},
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
		Position:     position,
		OptionsJSON:  emptyQuestionOptionsJSON,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
}
