package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/store"
)

/*
BuildDailyReportPreviewInput contains filters for daily report preview generation.
*/
type BuildDailyReportPreviewInput struct {
	ActorUserID    string
	WorkspaceID    string
	OccurrenceDate string
	SortMode       string
}

/*
PostDailyReportPreviewInput contains filters and actor data for posting a daily report.
*/
type PostDailyReportPreviewInput struct {
	ActorUserID    string
	IsSystemAdmin  bool
	WorkspaceID    string
	OccurrenceDate string
	SortMode       string
}

/*
PostDailyReportPreviewResult contains the posted preview.
*/
type PostDailyReportPreviewResult struct {
	Preview domain.DailyReportPreview
	Posted  bool
}

/*
ReportService builds and publishes Campfire report previews.
*/
type ReportService struct {
	standupService     *StandupService
	workspaceStore     store.WorkspaceStore
	workspaceRoleStore store.WorkspaceRoleStore
	reportPublisher    ReportPublisher
}

/*
NewReportService creates a report service.
*/
func NewReportService(
	standupService *StandupService,
	workspaceStore store.WorkspaceStore,
	workspaceRoleStore store.WorkspaceRoleStore,
	reportPublisher ReportPublisher,
) *ReportService {
	return &ReportService{
		standupService:     standupService,
		workspaceStore:     workspaceStore,
		workspaceRoleStore: workspaceRoleStore,
		reportPublisher:    reportPublisher,
	}
}

/*
BuildDailyPreview builds a Markdown daily report preview.

The preview includes submitted standups, missing users, and users skipped because
they are on approved leave.
*/
func (s *ReportService) BuildDailyPreview(
	ctx context.Context,
	input BuildDailyReportPreviewInput,
) (*domain.DailyReportPreview, error) {
	configuration, err := s.standupService.ListConfiguration(ctx, ListStandupConfigurationInput{
		ActorUserID: input.ActorUserID,
		WorkspaceID: input.WorkspaceID,
	})
	if err != nil {
		return nil, err
	}

	summary, err := s.standupService.ListSubmissions(ctx, ListStandupSubmissionsInput{
		ActorUserID:    input.ActorUserID,
		WorkspaceID:    input.WorkspaceID,
		OccurrenceDate: input.OccurrenceDate,
		SortMode:       input.SortMode,
	})
	if err != nil {
		return nil, err
	}

	questionsByID := questionsByID(configuration.Questions)
	rows := buildDailyReportRows(summary.Submissions, questionsByID)

	preview := &domain.DailyReportPreview{
		WorkspaceID:      domain.ID(summary.WorkspaceID),
		OccurrenceDate:   domain.LocalDate(summary.OccurrenceDate),
		SortMode:         summary.SortMode,
		SubmittedUserIDs: summary.SubmittedUserIDs,
		MissingUserIDs:   summary.MissingUserIDs,
		OnLeaveUserIDs:   summary.OnLeaveUserIDs,
		Rows:             rows,
		Markdown:         "",
	}

	preview.Markdown = buildDailyReportMarkdown(*preview)

	return preview, nil
}

/*
PostDailyPreview builds a daily report preview and posts it to the workspace channel.
*/
func (s *ReportService) PostDailyPreview(
	ctx context.Context,
	input PostDailyReportPreviewInput,
) (*PostDailyReportPreviewResult, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to post daily reports.")
	}

	cleanWorkspaceID := strings.TrimSpace(input.WorkspaceID)
	if cleanWorkspaceID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
	}

	workspaceID := domain.ID(cleanWorkspaceID)
	workspace, err := s.workspaceStore.GetByID(ctx, workspaceID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Workspace was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load workspace.")
	}

	if err := s.requireReportPostPermission(ctx, cleanActorUserID, input.IsSystemAdmin, workspaceID); err != nil {
		return nil, err
	}

	preview, err := s.BuildDailyPreview(ctx, BuildDailyReportPreviewInput{
		ActorUserID:    cleanActorUserID,
		WorkspaceID:    cleanWorkspaceID,
		OccurrenceDate: input.OccurrenceDate,
		SortMode:       input.SortMode,
	})
	if err != nil {
		return nil, err
	}

	if strings.TrimSpace(preview.Markdown) == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Daily report preview is empty.")
	}

	if err := s.reportPublisher.PostDailyReport(ctx, DailyReportPost{
		WorkspaceID:    workspace.ID.String(),
		WorkspaceName:  workspace.Name,
		ChannelID:      workspace.ChannelID,
		OccurrenceDate: preview.OccurrenceDate.String(),
		Markdown:       preview.Markdown,
		PostedByUserID: cleanActorUserID,
	}); err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not post daily report to the channel.")
	}

	return &PostDailyReportPreviewResult{
		Preview: *preview,
		Posted:  true,
	}, nil
}

/*
requireReportPostPermission ensures the actor can post reports to the channel.
*/
func (s *ReportService) requireReportPostPermission(
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
		[]domain.Role{domain.RoleLead, domain.RoleApprover},
	)
	if err != nil {
		return NewError(ErrorCodeInternal, "Could not verify report posting permission.")
	}

	if !hasRole {
		return NewError(ErrorCodePermissionDenied, "Only workspace Leads, Approvers, and System Admins can post reports.")
	}

	return nil
}

/*
buildDailyReportRows maps standup submissions into report rows.
*/
func buildDailyReportRows(
	submissions []domain.StandupSubmissionWithAnswers,
	questionsByID map[string]domain.StandupQuestion,
) []domain.DailyReportSubmissionRow {
	rows := make([]domain.DailyReportSubmissionRow, 0, len(submissions))

	for _, submission := range submissions {
		answerRows := make([]domain.DailyReportAnswerRow, 0, len(submission.Answers))

		for _, answer := range submission.Answers {
			question, exists := questionsByID[answer.QuestionID.String()]
			if !exists {
				continue
			}

			if !question.ShowInReport || question.IsPrivate {
				continue
			}

			answerRows = append(answerRows, domain.DailyReportAnswerRow{
				QuestionID:    answer.QuestionID,
				QuestionLabel: firstNonEmptyReportString(question.Prompt, question.Label, question.ID.String()),
				ValueText:     answerValueJSONToText(answer.ValueJSON),
				ShowInReport:  question.ShowInReport,
				IsPrivate:     question.IsPrivate,
				Position:      question.Position,
			})
		}

		sort.SliceStable(answerRows, func(firstIndex int, secondIndex int) bool {
			return answerRows[firstIndex].Position < answerRows[secondIndex].Position
		})

		rows = append(rows, domain.DailyReportSubmissionRow{
			UserID:           submission.Submission.UserID,
			FirstSubmittedAt: submission.Submission.FirstSubmittedAt,
			LastUpdatedAt:    submission.Submission.LastUpdatedAt,
			Answers:          answerRows,
		})
	}

	return rows
}

/*
buildDailyReportMarkdown builds the Markdown report body.
*/
func buildDailyReportMarkdown(preview domain.DailyReportPreview) string {
	lines := []string{
		fmt.Sprintf("# Daily Standup — %s", preview.OccurrenceDate.String()),
		"",
		fmt.Sprintf("- Submitted: %d", len(preview.SubmittedUserIDs)),
		fmt.Sprintf("- Missing: %d", len(preview.MissingUserIDs)),
		fmt.Sprintf("- On approved leave: %d", len(preview.OnLeaveUserIDs)),
		"",
	}

	if len(preview.OnLeaveUserIDs) > 0 {
		lines = append(lines, "## On approved leave")
		for _, userID := range preview.OnLeaveUserIDs {
			lines = append(lines, fmt.Sprintf("- %s", sanitizeMarkdownLine(userID)))
		}

		lines = append(lines, "")
	}

	if len(preview.MissingUserIDs) > 0 {
		lines = append(lines, "## Missing")
		for _, userID := range preview.MissingUserIDs {
			lines = append(lines, fmt.Sprintf("- %s", sanitizeMarkdownLine(userID)))
		}

		lines = append(lines, "")
	}

	lines = append(lines, "## Submitted")

	if len(preview.Rows) == 0 {
		lines = append(lines, "No submitted standups yet.", "")
		return strings.Join(lines, "\n")
	}

	for _, row := range preview.Rows {
		lines = append(lines, fmt.Sprintf("### %s", sanitizeMarkdownLine(row.UserID)))
		lines = append(
			lines,
			fmt.Sprintf(
				"_First submitted: %s · Last updated: %s_",
				formatReportTime(row.FirstSubmittedAt),
				formatReportTime(row.LastUpdatedAt),
			),
			"",
		)

		if len(row.Answers) == 0 {
			lines = append(lines, "- No report-visible answers.", "")
			continue
		}

		for _, answer := range row.Answers {
			lines = append(
				lines,
				fmt.Sprintf(
					"- **%s:** %s",
					sanitizeMarkdownLine(answer.QuestionLabel),
					sanitizeMarkdownLine(answer.ValueText),
				),
			)
		}

		lines = append(lines, "")
	}

	return strings.TrimSpace(strings.Join(lines, "\n")) + "\n"
}

/*
questionsByID maps standup questions by ID.
*/
func questionsByID(questions []domain.StandupQuestion) map[string]domain.StandupQuestion {
	result := map[string]domain.StandupQuestion{}

	for _, question := range questions {
		result[question.ID.String()] = question
	}

	return result
}

/*
answerValueJSONToText converts stored JSON answers into readable report text.
*/
func answerValueJSONToText(valueJSON string) string {
	cleanValueJSON := strings.TrimSpace(valueJSON)
	if cleanValueJSON == "" || cleanValueJSON == "null" {
		return ""
	}

	var stringValue string
	if err := json.Unmarshal([]byte(cleanValueJSON), &stringValue); err == nil {
		return stringValue
	}

	var boolValue bool
	if err := json.Unmarshal([]byte(cleanValueJSON), &boolValue); err == nil {
		if boolValue {
			return "Yes"
		}

		return "No"
	}

	var numberValue float64
	if err := json.Unmarshal([]byte(cleanValueJSON), &numberValue); err == nil {
		return strconv.FormatFloat(numberValue, 'f', -1, 64)
	}

	var stringValues []string
	if err := json.Unmarshal([]byte(cleanValueJSON), &stringValues); err == nil {
		return strings.Join(stringValues, ", ")
	}

	var rawValues []json.RawMessage
	if err := json.Unmarshal([]byte(cleanValueJSON), &rawValues); err == nil {
		textValues := make([]string, 0, len(rawValues))
		for _, rawValue := range rawValues {
			textValues = append(textValues, answerValueJSONToText(string(rawValue)))
		}

		return strings.Join(textValues, ", ")
	}

	return cleanValueJSON
}

/*
firstNonEmptyReportString returns the first non-empty value.
*/
func firstNonEmptyReportString(values ...string) string {
	for _, value := range values {
		cleanValue := strings.TrimSpace(value)
		if cleanValue != "" {
			return cleanValue
		}
	}

	return ""
}

/*
sanitizeMarkdownLine keeps generated Markdown compact and line-safe.
*/
func sanitizeMarkdownLine(value string) string {
	cleanValue := strings.TrimSpace(value)
	cleanValue = strings.ReplaceAll(cleanValue, "\r\n", " ")
	cleanValue = strings.ReplaceAll(cleanValue, "\n", " ")
	cleanValue = strings.ReplaceAll(cleanValue, "\r", " ")

	return cleanValue
}

/*
formatReportTime formats report timestamps in UTC for deterministic previews.
*/
func formatReportTime(value time.Time) string {
	if value.IsZero() {
		return ""
	}

	return value.UTC().Format(time.RFC3339)
}
