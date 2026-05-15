package service

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
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
ReportService builds Campfire report previews.
*/
type ReportService struct {
	standupService *StandupService
}

/*
NewReportService creates a report service.
*/
func NewReportService(standupService *StandupService) *ReportService {
	return &ReportService{
		standupService: standupService,
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
