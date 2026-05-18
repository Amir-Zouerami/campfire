package service

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"

	"strconv"
	"strings"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/store"
)

/*
ExportWorkspaceTimeCSVInput contains workspace time CSV filters.
*/
type ExportWorkspaceTimeCSVInput struct {
	ActorUserID   string
	IsSystemAdmin bool
	WorkspaceID   string
	StartDate     string
	EndDate       string
}

/*
ExportWorkspaceLeavesCSVInput contains workspace leave CSV filters.
*/
type ExportWorkspaceLeavesCSVInput struct {
	ActorUserID   string
	IsSystemAdmin bool
	WorkspaceID   string
	StartDate     string
	EndDate       string
}

/*
ExportWorkspaceStandupSubmissionsCSVInput contains standup submission CSV filters.
*/
type ExportWorkspaceStandupSubmissionsCSVInput struct {
	ActorUserID   string
	IsSystemAdmin bool
	WorkspaceID   string
	StartDate     string
	EndDate       string
	SortMode      string
}

/*
ExportWorkspaceMissingStandupsCSVInput contains missing-standup CSV filters.
*/
type ExportWorkspaceMissingStandupsCSVInput struct {
	ActorUserID   string
	IsSystemAdmin bool
	WorkspaceID   string
	StartDate     string
	EndDate       string
	SortMode      string
}

/*
ExportService builds CSV exports for workspace reports.
*/
type ExportService struct {
	workspaceStore        store.WorkspaceStore
	workspaceRoleStore    store.WorkspaceRoleStore
	taskStore             store.TaskStore
	leaveStore            store.LeaveStore
	standupService        *StandupService
	userDirectoryProvider UserDirectoryProvider
}

/*
NewExportService creates an export service.
*/
func NewExportService(
	workspaceStore store.WorkspaceStore,
	workspaceRoleStore store.WorkspaceRoleStore,
	taskStore store.TaskStore,
	leaveStore store.LeaveStore,
	standupService *StandupService,
	userDirectoryProvider UserDirectoryProvider,
) *ExportService {
	return &ExportService{
		workspaceStore:        workspaceStore,
		workspaceRoleStore:    workspaceRoleStore,
		taskStore:             taskStore,
		leaveStore:            leaveStore,
		standupService:        standupService,
		userDirectoryProvider: userDirectoryProvider,
	}
}

/*
ExportWorkspaceTimeCSV returns a CSV file for workspace time entries.
*/
func (s *ExportService) ExportWorkspaceTimeCSV(
	ctx context.Context,
	input ExportWorkspaceTimeCSVInput,
) ([]byte, error) {
	workspaceID, startDate, endDate, err := s.validateExportRequest(
		ctx,
		input.ActorUserID,
		input.IsSystemAdmin,
		input.WorkspaceID,
		input.StartDate,
		input.EndDate,
	)
	if err != nil {
		return nil, err
	}

	entries, err := s.taskStore.ListTimeEntriesByWorkspaceIDBetween(ctx, workspaceID, startDate, endDate)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load time entries for export.")
	}

	userIDs := []string{}
	for _, entry := range entries {
		userIDs = append(userIDs, entry.UserID, entry.CreatedBy)
	}
	userLabels := s.userLabelsForExport(ctx, userIDs)

	buffer := bytes.Buffer{}
	writer := csv.NewWriter(&buffer)

	if err := writer.Write([]string{
		"id",
		"workspace_id",
		"task_id",
		"user_id",
		"user_label",
		"entry_date",
		"minutes",
		"note",
		"project_id",
		"category_id",
		"created_by",
		"created_by_label",
		"created_at",
		"updated_at",
	}); err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not write time export header.")
	}

	for _, entry := range entries {
		if err := writer.Write([]string{
			entry.ID.String(),
			entry.WorkspaceID.String(),
			entry.TaskID.String(),
			entry.UserID,
			exportUserLabel(userLabels, entry.UserID),
			entry.EntryDate.String(),
			strconv.Itoa(entry.Minutes),
			entry.Note,
			entry.ProjectID.String(),
			entry.CategoryID.String(),
			entry.CreatedBy,
			exportUserLabel(userLabels, entry.CreatedBy),
			formatExportTime(entry.CreatedAt),
			formatExportTime(entry.UpdatedAt),
		}); err != nil {
			return nil, NewError(ErrorCodeInternal, "Could not write time export row.")
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not finalize time export.")
	}

	return buffer.Bytes(), nil
}

/*
ExportWorkspaceStandupSubmissionsCSV returns a CSV file for standup submissions and answers.
*/
func (s *ExportService) ExportWorkspaceStandupSubmissionsCSV(
	ctx context.Context,
	input ExportWorkspaceStandupSubmissionsCSVInput,
) ([]byte, error) {
	workspaceID, startDate, endDate, err := s.validateExportRequest(
		ctx,
		input.ActorUserID,
		input.IsSystemAdmin,
		input.WorkspaceID,
		input.StartDate,
		input.EndDate,
	)
	if err != nil {
		return nil, err
	}

	dates, err := exportDatesInInclusiveRange(startDate, endDate)
	if err != nil {
		return nil, NewError(ErrorCodeValidationFailed, "Export date range is invalid.")
	}

	configuration, err := s.standupService.ListConfiguration(ctx, ListStandupConfigurationInput{
		ActorUserID: input.ActorUserID,
		WorkspaceID: workspaceID.String(),
	})
	if err != nil {
		return nil, err
	}

	questionsByID := exportQuestionsByID(configuration.Questions)
	summaries := make([]exportStandupSummaryByDate, 0, len(dates))
	userIDs := []string{}

	for _, date := range dates {
		summary, err := s.standupService.ListSubmissions(ctx, ListStandupSubmissionsInput{
			ActorUserID:    input.ActorUserID,
			WorkspaceID:    workspaceID.String(),
			OccurrenceDate: date.String(),
			SortMode:       input.SortMode,
		})
		if err != nil {
			return nil, err
		}

		summaries = append(summaries, exportStandupSummaryByDate{
			Date:    date,
			Summary: *summary,
		})

		for _, submissionWithAnswers := range summary.Submissions {
			userIDs = append(userIDs, submissionWithAnswers.Submission.UserID)
		}
	}

	userLabels := s.userLabelsForExport(ctx, userIDs)

	buffer := bytes.Buffer{}
	writer := csv.NewWriter(&buffer)

	if err := writer.Write([]string{
		"occurrence_date",
		"submission_id",
		"workspace_id",
		"template_id",
		"schedule_id",
		"user_id",
		"user_label",
		"status",
		"first_submitted_at",
		"last_updated_at",
		"answer_id",
		"question_id",
		"question_label",
		"question_type",
		"answer_value",
		"answer_created_at",
		"answer_updated_at",
	}); err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not write standup export header.")
	}

	for _, summaryByDate := range summaries {
		for _, submissionWithAnswers := range summaryByDate.Summary.Submissions {
			submission := submissionWithAnswers.Submission
			userLabel := exportUserLabel(userLabels, submission.UserID)

			if len(submissionWithAnswers.Answers) == 0 {
				if err := writer.Write([]string{
					summaryByDate.Date.String(),
					submission.ID.String(),
					submission.WorkspaceID.String(),
					submission.TemplateID.String(),
					submission.ScheduleID.String(),
					submission.UserID,
					userLabel,
					string(submission.Status),
					formatExportTime(submission.FirstSubmittedAt),
					formatExportTime(submission.LastUpdatedAt),
					"",
					"",
					"",
					"",
					"",
					"",
					"",
				}); err != nil {
					return nil, NewError(ErrorCodeInternal, "Could not write standup export row.")
				}

				continue
			}

			for _, answer := range submissionWithAnswers.Answers {
				question := questionsByID[answer.QuestionID.String()]

				if err := writer.Write([]string{
					summaryByDate.Date.String(),
					submission.ID.String(),
					submission.WorkspaceID.String(),
					submission.TemplateID.String(),
					submission.ScheduleID.String(),
					submission.UserID,
					userLabel,
					string(submission.Status),
					formatExportTime(submission.FirstSubmittedAt),
					formatExportTime(submission.LastUpdatedAt),
					answer.ID.String(),
					answer.QuestionID.String(),
					exportQuestionLabel(question),
					exportQuestionType(question),
					formatStandupAnswerValueForCSV(answer.ValueJSON),
					formatExportTime(answer.CreatedAt),
					formatExportTime(answer.UpdatedAt),
				}); err != nil {
					return nil, NewError(ErrorCodeInternal, "Could not write standup export row.")
				}
			}
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not finalize standup export.")
	}

	return buffer.Bytes(), nil
}

/*
ExportWorkspaceMissingStandupsCSV returns a CSV file for missing standup users.
*/
func (s *ExportService) ExportWorkspaceMissingStandupsCSV(
	ctx context.Context,
	input ExportWorkspaceMissingStandupsCSVInput,
) ([]byte, error) {
	workspaceID, startDate, endDate, err := s.validateExportRequest(
		ctx,
		input.ActorUserID,
		input.IsSystemAdmin,
		input.WorkspaceID,
		input.StartDate,
		input.EndDate,
	)
	if err != nil {
		return nil, err
	}

	dates, err := exportDatesInInclusiveRange(startDate, endDate)
	if err != nil {
		return nil, NewError(ErrorCodeValidationFailed, "Export date range is invalid.")
	}

	summaries := make([]exportStandupSummaryByDate, 0, len(dates))
	userIDs := []string{}

	for _, date := range dates {
		summary, err := s.standupService.ListSubmissions(ctx, ListStandupSubmissionsInput{
			ActorUserID:    input.ActorUserID,
			WorkspaceID:    workspaceID.String(),
			OccurrenceDate: date.String(),
			SortMode:       input.SortMode,
		})
		if err != nil {
			return nil, err
		}

		summaries = append(summaries, exportStandupSummaryByDate{
			Date:    date,
			Summary: *summary,
		})

		userIDs = append(userIDs, summary.MissingUserIDs...)
	}

	userLabels := s.userLabelsForExport(ctx, userIDs)

	buffer := bytes.Buffer{}
	writer := csv.NewWriter(&buffer)

	if err := writer.Write([]string{
		"occurrence_date",
		"workspace_id",
		"user_id",
		"user_label",
		"status",
	}); err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not write missing standup export header.")
	}

	for _, summaryByDate := range summaries {
		for _, userID := range summaryByDate.Summary.MissingUserIDs {
			if err := writer.Write([]string{
				summaryByDate.Date.String(),
				workspaceID.String(),
				userID,
				exportUserLabel(userLabels, userID),
				"missing",
			}); err != nil {
				return nil, NewError(ErrorCodeInternal, "Could not write missing standup export row.")
			}
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not finalize missing standup export.")
	}

	return buffer.Bytes(), nil
}

/*
ExportWorkspaceLeavesCSV returns a CSV file for approved workspace leave requests.
*/
func (s *ExportService) ExportWorkspaceLeavesCSV(
	ctx context.Context,
	input ExportWorkspaceLeavesCSVInput,
) ([]byte, error) {
	workspaceID, startDate, endDate, err := s.validateExportRequest(
		ctx,
		input.ActorUserID,
		input.IsSystemAdmin,
		input.WorkspaceID,
		input.StartDate,
		input.EndDate,
	)
	if err != nil {
		return nil, err
	}

	leaveRequests, err := s.leaveStore.ListApprovedByWorkspaceIDBetween(ctx, workspaceID, startDate, endDate)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load leave requests for export.")
	}

	userIDs := []string{}
	for _, row := range leaveRequests {
		userIDs = append(userIDs, row.LeaveRequest.UserID, row.LeaveRequest.BackupUserID)
	}
	userLabels := s.userLabelsForExport(ctx, userIDs)

	buffer := bytes.Buffer{}
	writer := csv.NewWriter(&buffer)

	if err := writer.Write([]string{
		"id",
		"workspace_id",
		"user_id",
		"user_label",
		"leave_type_id",
		"leave_type_name",
		"leave_type_color",
		"start_date",
		"end_date",
		"duration_mode",
		"half_day_part",
		"start_time",
		"end_time",
		"backup_user_id",
		"backup_user_label",
		"status",
		"created_at",
		"updated_at",
		"cancelled_at",
	}); err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not write leave export header.")
	}

	for _, row := range leaveRequests {
		leaveRequest := row.LeaveRequest

		if err := writer.Write([]string{
			leaveRequest.ID.String(),
			leaveRequest.WorkspaceID.String(),
			leaveRequest.UserID,
			exportUserLabel(userLabels, leaveRequest.UserID),
			leaveRequest.LeaveTypeID.String(),
			row.LeaveTypeName,
			row.LeaveTypeColor,
			leaveRequest.StartDate.String(),
			leaveRequest.EndDate.String(),
			string(leaveRequest.DurationMode),
			string(leaveRequest.HalfDayPart),
			leaveRequest.StartTime.String(),
			leaveRequest.EndTime.String(),
			leaveRequest.BackupUserID,
			exportUserLabel(userLabels, leaveRequest.BackupUserID),
			string(leaveRequest.Status),
			formatExportTime(leaveRequest.CreatedAt),
			formatExportTime(leaveRequest.UpdatedAt),
			formatOptionalExportTime(leaveRequest.CancelledAt),
		}); err != nil {
			return nil, NewError(ErrorCodeInternal, "Could not write leave export row.")
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not finalize leave export.")
	}

	return buffer.Bytes(), nil
}

/*
exportStandupSummaryByDate keeps a loaded standup summary with its date.
*/
type exportStandupSummaryByDate struct {
	Date    domain.LocalDate
	Summary StandupOccurrenceSummary
}

/*
userLabelsForExport resolves user IDs for CSV output.

CSV export should remain durable for historical data, so unresolved users fall
back to their raw Mattermost user ID.
*/
func (s *ExportService) userLabelsForExport(ctx context.Context, userIDs []string) map[string]string {
	labels := map[string]string{}
	normalizedUserIDs := normalizeUserIDs(userIDs)

	for _, userID := range normalizedUserIDs {
		labels[userID] = userID
	}

	if s.userDirectoryProvider == nil || len(normalizedUserIDs) == 0 {
		return labels
	}

	profiles, err := s.userDirectoryProvider.GetUsersByIDs(ctx, normalizedUserIDs)
	if err != nil {
		return labels
	}

	for _, profile := range profiles {
		cleanUserID := strings.TrimSpace(profile.ID)
		if cleanUserID == "" {
			continue
		}

		labels[cleanUserID] = exportUserProfileLabel(profile)
	}

	return labels
}

/*
exportUserProfileLabel returns the best human-readable label for one user profile.
*/
func exportUserProfileLabel(profile UserProfile) string {
	displayName := strings.TrimSpace(profile.DisplayName)
	if displayName != "" {
		return displayName
	}

	username := strings.TrimSpace(profile.Username)
	if username != "" {
		return "@" + username
	}

	return strings.TrimSpace(profile.ID)
}

/*
exportUserLabel returns a resolved user label or a stable fallback.
*/
func exportUserLabel(userLabels map[string]string, userID string) string {
	cleanUserID := strings.TrimSpace(userID)
	if cleanUserID == "" {
		return ""
	}

	label := strings.TrimSpace(userLabels[cleanUserID])
	if label != "" {
		return label
	}

	return cleanUserID
}

/*
validateExportRequest validates common CSV export filters and permissions.
*/
func (s *ExportService) validateExportRequest(
	ctx context.Context,
	actorUserID string,
	isSystemAdmin bool,
	workspaceIDValue string,
	startDateValue string,
	endDateValue string,
) (domain.ID, domain.LocalDate, domain.LocalDate, error) {
	cleanActorUserID := strings.TrimSpace(actorUserID)
	if cleanActorUserID == "" {
		return "", "", "", NewError(ErrorCodePermissionDenied, "You must be signed in to export reports.")
	}

	cleanWorkspaceID := strings.TrimSpace(workspaceIDValue)
	if cleanWorkspaceID == "" {
		return "", "", "", NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
	}

	workspaceID := domain.ID(cleanWorkspaceID)
	if _, err := s.workspaceStore.GetByID(ctx, workspaceID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return "", "", "", NewError(ErrorCodeNotFound, "Workspace was not found.")
		}

		return "", "", "", NewError(ErrorCodeInternal, "Could not load workspace.")
	}

	if err := s.requireExportPermission(ctx, cleanActorUserID, isSystemAdmin, workspaceID); err != nil {
		return "", "", "", err
	}

	startDate := domain.LocalDate(strings.TrimSpace(startDateValue))
	if _, err := parseLocalDate(startDate); err != nil {
		return "", "", "", NewError(ErrorCodeValidationFailed, "Start date must be a real YYYY-MM-DD calendar date.")
	}

	endDate := domain.LocalDate(strings.TrimSpace(endDateValue))
	if _, err := parseLocalDate(endDate); err != nil {
		return "", "", "", NewError(ErrorCodeValidationFailed, "End date must be a real YYYY-MM-DD calendar date.")
	}

	if endDate.String() < startDate.String() {
		return "", "", "", NewError(ErrorCodeValidationFailed, "End date cannot be before start date.")
	}

	return workspaceID, startDate, endDate, nil
}

/*
requireExportPermission verifies that an actor can export workspace reports.
*/
func (s *ExportService) requireExportPermission(
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
		[]domain.Role{domain.RoleLead, domain.RoleAdmin, domain.RoleViewer},
	)
	if err != nil {
		return NewError(ErrorCodeInternal, "Could not verify report export permission.")
	}

	if !hasRole {
		return NewError(ErrorCodePermissionDenied, "Only workspace Leads, Viewers, Admins, and System Admins can export reports.")
	}

	return nil
}

/*
exportDatesInInclusiveRange returns each local date in an inclusive range.
*/
func exportDatesInInclusiveRange(startDate domain.LocalDate, endDate domain.LocalDate) ([]domain.LocalDate, error) {
	start, err := time.Parse("2006-01-02", startDate.String())
	if err != nil {
		return nil, err
	}

	end, err := time.Parse("2006-01-02", endDate.String())
	if err != nil {
		return nil, err
	}

	dates := []domain.LocalDate{}
	for current := start; !current.After(end); current = current.AddDate(0, 0, 1) {
		dates = append(dates, domain.LocalDate(current.Format("2006-01-02")))
	}

	return dates, nil
}

/*
exportQuestionsByID returns standup questions keyed by ID.
*/
func exportQuestionsByID(questions []domain.StandupQuestion) map[string]domain.StandupQuestion {
	questionsByID := map[string]domain.StandupQuestion{}

	for _, question := range questions {
		questionsByID[question.ID.String()] = question
	}

	return questionsByID
}

/*
exportQuestionLabel returns a stable human label for a question.
*/
func exportQuestionLabel(question domain.StandupQuestion) string {
	if strings.TrimSpace(question.Prompt) != "" {
		return question.Prompt
	}

	if strings.TrimSpace(question.Label) != "" {
		return question.Label
	}

	return question.ID.String()
}

/*
exportQuestionType returns a stable question type string.
*/
func exportQuestionType(question domain.StandupQuestion) string {
	return string(question.Type)
}

/*
formatStandupAnswerValueForCSV converts JSON answer values into readable CSV text.
*/
func formatStandupAnswerValueForCSV(valueJSON string) string {
	var parsed interface{}
	if err := json.Unmarshal([]byte(valueJSON), &parsed); err != nil {
		return valueJSON
	}

	switch value := parsed.(type) {
	case nil:
		return ""

	case string:
		return value

	case bool:
		if value {
			return "true"
		}

		return "false"

	case float64:
		return strconv.FormatFloat(value, 'f', -1, 64)

	case []interface{}:
		values := make([]string, 0, len(value))
		for _, item := range value {
			values = append(values, fmt.Sprint(item))
		}

		return strings.Join(values, ", ")

	default:
		return fmt.Sprint(value)
	}
}

/*
formatExportTime formats a UTC timestamp for CSV.
*/
func formatExportTime(value time.Time) string {
	if value.IsZero() {
		return ""
	}

	return value.UTC().Format(time.RFC3339)
}

/*
formatOptionalExportTime formats an optional UTC timestamp for CSV.
*/
func formatOptionalExportTime(value *time.Time) string {
	if value == nil {
		return ""
	}

	return formatExportTime(*value)
}
