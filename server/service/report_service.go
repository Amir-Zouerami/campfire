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
	"github.com/google/uuid"
)

/*
BuildDailyReportPreviewInput contains filters for daily report preview generation.
*/
type BuildDailyReportPreviewInput struct {
	ActorUserID    string
	WorkspaceID    string
	OccurrenceDate string
	SortMode       string

	// CalendarLabels contains untrusted, display-only browser-formatted labels keyed by YYYY-MM-DD.
	CalendarLabels map[string]string
}

/*
BuildWeeklyReportPreviewInput contains filters for weekly report preview generation.
*/
type BuildWeeklyReportPreviewInput struct {
	ActorUserID string
	WorkspaceID string
	PeriodStart string
	PeriodEnd   string
	SortMode    string

	// CalendarLabels contains untrusted, display-only browser-formatted labels keyed by YYYY-MM-DD.
	CalendarLabels map[string]string
}

/*
ListDailyReportRunsInput contains filters for daily report history.
*/
type ListDailyReportRunsInput struct {
	ActorUserID string
	WorkspaceID string
	Limit       int
}

/*
ListReportRulesInput contains filters for listing report settings.
*/
type ListReportRulesInput struct {
	ActorUserID string
	WorkspaceID string
}

/*
UpdateReportRuleInput contains mutable report-rule settings.
*/
type UpdateReportRuleInput struct {
	ActorUserID     string
	IsSystemAdmin   bool
	WorkspaceID     string
	ReportRuleID    string
	Enabled         bool
	PostToChannel   bool
	PreviewRequired bool
	SortMode        string
	ReportLanguage  string
	IncludeOnLeave  bool
	IncludeMissing  bool
	IncludeTime     bool
	IncludeBlockers bool
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
	AllowRepost    bool

	// CalendarLabels contains untrusted, display-only browser-formatted labels keyed by YYYY-MM-DD.
	CalendarLabels map[string]string
}

/*
PostDailyReportPreviewResult contains the posted preview and report run.
*/
type PostDailyReportPreviewResult struct {
	Preview domain.DailyReportPreview
	Run     domain.ReportRun
	Posted  bool
}

/*
PostWeeklyReportPreviewInput contains filters and actor data for posting a weekly report.
*/
type PostWeeklyReportPreviewInput struct {
	ActorUserID   string
	IsSystemAdmin bool
	WorkspaceID   string
	PeriodStart   string
	PeriodEnd     string
	SortMode      string
	AllowRepost   bool

	// CalendarLabels contains untrusted, display-only browser-formatted labels keyed by YYYY-MM-DD.
	CalendarLabels map[string]string
}

/*
PostWeeklyReportPreviewResult contains the posted weekly preview and report run.
*/
type PostWeeklyReportPreviewResult struct {
	Preview domain.WeeklyReportPreview
	Run     domain.ReportRun
	Posted  bool
}

/*
PostDailyReportAutomationInput identifies a scheduled daily report attempt.
*/
type PostDailyReportAutomationInput struct {
	WorkspaceID    string
	ScheduleID     string
	OccurrenceDate string
}

/*
PostWeeklyReportAutomationInput identifies a scheduled weekly report attempt.
*/
type PostWeeklyReportAutomationInput struct {
	WorkspaceID string
	ScheduleID  string
	PeriodStart string
	PeriodEnd   string
}

/*
PostDailyReportAutomationResult summarizes a scheduled daily report attempt.
*/
type PostDailyReportAutomationResult struct {
	Posted        bool
	SkippedReason string
	Run           *domain.ReportRun
}

/*
PostWeeklyReportAutomationResult summarizes a scheduled weekly report attempt.
*/
type PostWeeklyReportAutomationResult struct {
	Posted        bool
	SkippedReason string
	Run           *domain.ReportRun
}

/*
ReportService builds and publishes Campfire report previews.
*/
type ReportService struct {
	standupService        *StandupService
	workspaceStore        store.WorkspaceStore
	workspaceRoleStore    store.WorkspaceRoleStore
	reportStore           store.ReportStore
	taskStore             store.TaskStore
	reportPublisher       ReportPublisher
	userDirectoryProvider UserDirectoryProvider
}

/*
NewReportService creates a report service.
*/
func NewReportService(
	standupService *StandupService,
	workspaceStore store.WorkspaceStore,
	workspaceRoleStore store.WorkspaceRoleStore,
	reportStore store.ReportStore,
	taskStore store.TaskStore,
	reportPublisher ReportPublisher,
	userDirectoryProvider UserDirectoryProvider,
) *ReportService {
	return &ReportService{
		standupService:        standupService,
		workspaceStore:        workspaceStore,
		workspaceRoleStore:    workspaceRoleStore,
		reportStore:           reportStore,
		taskStore:             taskStore,
		reportPublisher:       reportPublisher,
		userDirectoryProvider: userDirectoryProvider,
	}
}

/*
BuildDailyPreview builds a Markdown daily report preview.

The preview includes submitted standups, missing users, and users skipped because
they are on approved leave. It only builds a report when a daily standup schedule
is actually active for the selected workspace date.
*/
func (s *ReportService) BuildDailyPreview(
	ctx context.Context,
	input BuildDailyReportPreviewInput,
) (*domain.DailyReportPreview, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to view daily reports.")
	}

	cleanWorkspaceID := strings.TrimSpace(input.WorkspaceID)
	if cleanWorkspaceID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
	}

	occurrenceDate := domain.LocalDate(strings.TrimSpace(input.OccurrenceDate))
	if _, err := parseLocalDate(occurrenceDate); err != nil {
		return nil, NewError(ErrorCodeValidationFailed, "Occurrence date must be a real YYYY-MM-DD calendar date.")
	}

	workspace, err := s.loadReportWorkspace(ctx, cleanWorkspaceID)
	if err != nil {
		return nil, err
	}

	configuration, err := s.standupService.ListConfiguration(ctx, ListStandupConfigurationInput{
		ActorUserID: cleanActorUserID,
		WorkspaceID: cleanWorkspaceID,
	})
	if err != nil {
		return nil, err
	}

	activeScheduleContext, err := s.activeReportSchedulesForDate(
		ctx,
		*workspace,
		*configuration,
		domain.ReportKindDaily,
		occurrenceDate,
	)
	if err != nil {
		return nil, err
	}

	summary, err := s.standupService.ListSubmissions(ctx, ListStandupSubmissionsInput{
		ActorUserID:    cleanActorUserID,
		WorkspaceID:    cleanWorkspaceID,
		OccurrenceDate: occurrenceDate.String(),
		SortMode:       input.SortMode,
	})
	if err != nil {
		return nil, err
	}

	dailySubmissions := filterReportSubmissionsBySchedule(summary.Submissions, activeScheduleContext.ScheduleIDs)
	submittedUserIDs := submittedUserIDsFromSubmissions(dailySubmissions)
	missingUserIDs := missingStandupUserIDs(summary.MemberUserIDs, submittedUserIDs, summary.OnLeaveUserIDs)
	rows := buildDailyReportRows(dailySubmissions, questionsByID(configuration.Questions))

	preview := &domain.DailyReportPreview{
		WorkspaceID:      domain.ID(summary.WorkspaceID),
		OccurrenceDate:   occurrenceDate,
		SortMode:         summary.SortMode,
		SubmittedUserIDs: submittedUserIDs,
		MissingUserIDs:   missingUserIDs,
		OnLeaveUserIDs:   summary.OnLeaveUserIDs,
		Rows:             rows,
		Markdown:         "",
	}

	calendarLabels := normalizeReportCalendarLabels(input.CalendarLabels)
	formatSettings, err := s.reportFormatSettingsForKind(ctx, workspace.ID, domain.ReportKindDaily)
	if err != nil {
		return nil, err
	}
	if err := s.applyReportItemTimes(
		ctx,
		workspace.ID,
		preview.OccurrenceDate,
		preview.OccurrenceDate,
		formatSettings.IncludeTime,
		preview,
	); err != nil {
		return nil, err
	}

	userLabels := s.userLabelsForReport(ctx, collectDailyPreviewUserIDs(*preview))
	preview.Markdown = buildDailyReportMarkdown(
		*preview,
		userLabels,
		*workspace,
		calendarLabels,
		formatSettings.Language,
	)

	return preview, nil
}

/*
reportFormatSettings contains display and content settings for a report kind.
*/
type reportFormatSettings struct {
	Language    domain.ReportLanguage
	IncludeTime bool
}

/*
reportFormatSettingsForKind returns the report-rule settings used by manual
preview/post flows. Enabled rules are preferred, but disabled rules still carry
admin-selected display settings for manual report previews.
*/
func (s *ReportService) reportFormatSettingsForKind(
	ctx context.Context,
	workspaceID domain.ID,
	reportKind domain.ReportKind,
) (reportFormatSettings, error) {
	settings := reportFormatSettings{
		Language:    domain.ReportLanguageEnglish,
		IncludeTime: false,
	}

	rules, err := s.reportStore.ListRulesByWorkspaceID(ctx, workspaceID)
	if err != nil {
		return settings, NewError(ErrorCodeInternal, "Could not load report display settings.")
	}

	rule := preferredReportRuleForKind(rules, reportKind)
	if rule == nil {
		return settings, nil
	}

	settings.Language = normalizeReportLanguage(rule.ReportLanguage)
	settings.IncludeTime = rule.IncludeTime

	return settings, nil
}

/*
reportTimeSummary returns a workspace time summary when the report settings ask
daily or weekly reports to include time tracking.
*/
func (s *ReportService) reportTimeSummary(
	ctx context.Context,
	workspaceID domain.ID,
	startDate domain.LocalDate,
	endDate domain.LocalDate,
	includeTime bool,
) (*domain.TimeReportSummary, error) {
	if s.taskStore == nil || !includeTime {
		return nil, nil
	}

	entries, err := s.taskStore.ListTimeEntriesByWorkspaceIDBetween(ctx, workspaceID, startDate, endDate)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load time entries for the report.")
	}

	tasks, err := s.taskStore.ListTasksByWorkspaceID(ctx, workspaceID, true)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load tasks for the report time summary.")
	}

	tasksByID := indexTimeReportTasks(tasks)
	summary := buildTimeReportSummary(
		workspaceID,
		startDate,
		endDate,
		domain.TimeReportGroupByPerson,
		entries,
		tasksByID,
	)

	return summary, nil
}

/*
applyReportItemTimes annotates report-visible progress items with tracked time.

The lookup is display-only. Time is attached to matching Campfire tasks for the
selected report date range and is never used to decide submission state or report
eligibility.
*/
func (s *ReportService) applyReportItemTimes(
	ctx context.Context,
	workspaceID domain.ID,
	startDate domain.LocalDate,
	endDate domain.LocalDate,
	includeTime bool,
	preview *domain.DailyReportPreview,
) error {
	if preview == nil || s.taskStore == nil || !includeTime {
		return nil
	}

	lookup, err := s.reportItemTimeLookup(ctx, workspaceID, startDate, endDate)
	if err != nil {
		return err
	}

	for rowIndex := range preview.Rows {
		userLookup := lookup[strings.TrimSpace(preview.Rows[rowIndex].UserID)]
		if len(userLookup) == 0 {
			continue
		}

		for answerIndex := range preview.Rows[rowIndex].Answers {
			answer := &preview.Rows[rowIndex].Answers[answerIndex]
			if !answer.ShowItemTime || len(answer.ValueItems) == 0 {
				continue
			}

			if len(answer.ValueItemMinutes) != len(answer.ValueItems) {
				answer.ValueItemMinutes = reportEmptyItemMinutes(answer.ValueItems)
			}

			for itemIndex, item := range answer.ValueItems {
				minutes := userLookup[normalizedTaskTitleKey(item)]
				if minutes > 0 {
					answer.ValueItemMinutes[itemIndex] = minutes
				}
			}
		}
	}

	return nil
}

/*
reportItemTimeLookup aggregates tracked time by user and normalized task title
for a report display range.
*/
func (s *ReportService) reportItemTimeLookup(
	ctx context.Context,
	workspaceID domain.ID,
	startDate domain.LocalDate,
	endDate domain.LocalDate,
) (map[string]map[string]int, error) {
	entries, err := s.taskStore.ListTimeEntriesByWorkspaceIDBetween(ctx, workspaceID, startDate, endDate)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load time entries for the report.")
	}

	if len(entries) == 0 {
		return map[string]map[string]int{}, nil
	}

	tasks, err := s.taskStore.ListTasksByWorkspaceID(ctx, workspaceID, true)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load tasks for the report time labels.")
	}

	tasksByID := indexTimeReportTasks(tasks)
	lookup := map[string]map[string]int{}
	for _, entry := range entries {
		task := tasksByID[entry.TaskID.String()]
		titleKey := normalizedTaskTitleKey(task.Title)
		if titleKey == "" {
			continue
		}

		userID := strings.TrimSpace(task.UserID)
		if userID == "" {
			userID = strings.TrimSpace(entry.UserID)
		}
		if userID == "" {
			continue
		}

		if lookup[userID] == nil {
			lookup[userID] = map[string]int{}
		}
		lookup[userID][titleKey] += entry.Minutes
	}

	return lookup, nil
}

/*
ListRules returns report rules for one workspace.
*/
func (s *ReportService) ListRules(
	ctx context.Context,
	input ListReportRulesInput,
) ([]domain.ReportRule, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to view report settings.")
	}

	workspaceID, err := s.requireReportWorkspace(ctx, input.WorkspaceID)
	if err != nil {
		return nil, err
	}

	rules, err := s.reportStore.ListRulesByWorkspaceID(ctx, workspaceID)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load report settings.")
	}

	return rules, nil
}

/*
UpdateRule validates and updates one report rule.
*/
func (s *ReportService) UpdateRule(
	ctx context.Context,
	input UpdateReportRuleInput,
) (*domain.ReportRule, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to update report settings.")
	}

	workspaceID, err := s.requireReportWorkspace(ctx, input.WorkspaceID)
	if err != nil {
		return nil, err
	}

	if err := s.requireReportPostPermission(ctx, cleanActorUserID, input.IsSystemAdmin, workspaceID); err != nil {
		return nil, err
	}

	reportRuleID := domain.ID(strings.TrimSpace(input.ReportRuleID))
	if reportRuleID.String() == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Report rule ID is required.")
	}

	sortMode := domain.ReportSortMode(strings.TrimSpace(input.SortMode))
	if !isValidReportSortMode(sortMode) {
		return nil, NewError(ErrorCodeValidationFailed, "Report sort mode is not supported.")
	}

	reportLanguage := normalizeReportLanguage(domain.ReportLanguage(strings.TrimSpace(input.ReportLanguage)))
	if !isValidReportLanguage(reportLanguage) {
		return nil, NewError(ErrorCodeValidationFailed, "Report language is not supported.")
	}

	rules, err := s.reportStore.ListRulesByWorkspaceID(ctx, workspaceID)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load report settings.")
	}

	existingRule := findReportRule(rules, reportRuleID)
	if existingRule == nil {
		return nil, NewError(ErrorCodeNotFound, "Report rule was not found.")
	}

	updatedRule := *existingRule
	updatedRule.Enabled = input.Enabled
	updatedRule.PostToChannel = input.PostToChannel
	updatedRule.PreviewRequired = input.PreviewRequired
	updatedRule.SortMode = sortMode
	updatedRule.ReportLanguage = reportLanguage
	updatedRule.IncludeOnLeave = input.IncludeOnLeave
	updatedRule.IncludeMissing = input.IncludeMissing
	updatedRule.IncludeTime = input.IncludeTime
	updatedRule.IncludeBlockers = input.IncludeBlockers
	updatedRule.UpdatedAt = time.Now().UTC()

	updated, err := s.reportStore.UpdateRule(ctx, updatedRule)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Report rule was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not update report settings.")
	}

	return updated, nil
}

/*
BuildWeeklyPreview builds a Markdown weekly report preview.

The weekly preview renders only the weekly standup occurrence active inside the
selected period. It must not stitch together daily standup reports across the
week, and it must not use an arbitrary period end when the workspace weekly
standup runs on the last working day before that end.
*/
func (s *ReportService) BuildWeeklyPreview(
	ctx context.Context,
	input BuildWeeklyReportPreviewInput,
) (*domain.WeeklyReportPreview, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to view weekly reports.")
	}

	cleanWorkspaceID := strings.TrimSpace(input.WorkspaceID)
	if cleanWorkspaceID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
	}

	periodStart := domain.LocalDate(strings.TrimSpace(input.PeriodStart))
	if _, err := parseLocalDate(periodStart); err != nil {
		return nil, NewError(ErrorCodeValidationFailed, "Period start must be a real YYYY-MM-DD calendar date.")
	}

	periodEnd := domain.LocalDate(strings.TrimSpace(input.PeriodEnd))
	if _, err := parseLocalDate(periodEnd); err != nil {
		return nil, NewError(ErrorCodeValidationFailed, "Period end must be a real YYYY-MM-DD calendar date.")
	}

	if periodEnd.String() < periodStart.String() {
		return nil, NewError(ErrorCodeValidationFailed, "Period end cannot be before period start.")
	}

	dates, err := datesInInclusiveRange(periodStart, periodEnd)
	if err != nil {
		return nil, NewError(ErrorCodeValidationFailed, "Weekly report period is invalid.")
	}

	if len(dates) == 0 || len(dates) > 14 {
		return nil, NewError(ErrorCodeValidationFailed, "Weekly report period must contain 1 to 14 days.")
	}

	sortMode := strings.TrimSpace(input.SortMode)
	if sortMode == "" {
		sortMode = string(domain.StandupSubmissionSortFirstSubmitted)
	}

	workspace, err := s.loadReportWorkspace(ctx, cleanWorkspaceID)
	if err != nil {
		return nil, err
	}

	configuration, err := s.standupService.ListConfiguration(ctx, ListStandupConfigurationInput{
		ActorUserID: cleanActorUserID,
		WorkspaceID: cleanWorkspaceID,
	})
	if err != nil {
		return nil, err
	}

	activeScheduleContext, err := s.activeWeeklyReportOccurrence(ctx, *workspace, *configuration, dates)
	if err != nil {
		return nil, err
	}

	weeklySummary, err := s.standupService.ListSubmissions(ctx, ListStandupSubmissionsInput{
		ActorUserID:    cleanActorUserID,
		WorkspaceID:    cleanWorkspaceID,
		OccurrenceDate: activeScheduleContext.OccurrenceDate.String(),
		SortMode:       sortMode,
	})
	if err != nil {
		return nil, err
	}

	weeklySubmissions := filterReportSubmissionsBySchedule(
		weeklySummary.Submissions,
		activeScheduleContext.ScheduleIDs,
	)
	submittedUserIDs := submittedUserIDsFromSubmissions(weeklySubmissions)
	onLeaveUserIDs := weeklySummary.OnLeaveUserIDs
	missingUserIDs := missingStandupUserIDs(
		weeklySummary.MemberUserIDs,
		submittedUserIDs,
		onLeaveUserIDs,
	)

	weeklySubmissionPreview := domain.DailyReportPreview{
		WorkspaceID:      domain.ID(weeklySummary.WorkspaceID),
		OccurrenceDate:   activeScheduleContext.OccurrenceDate,
		SortMode:         weeklySummary.SortMode,
		SubmittedUserIDs: submittedUserIDs,
		MissingUserIDs:   missingUserIDs,
		OnLeaveUserIDs:   onLeaveUserIDs,
		Rows:             buildDailyReportRows(weeklySubmissions, questionsByID(configuration.Questions)),
		Markdown:         "",
	}

	preview := &domain.WeeklyReportPreview{
		WorkspaceID:    domain.ID(cleanWorkspaceID),
		PeriodStart:    periodStart,
		PeriodEnd:      periodEnd,
		SortMode:       domain.StandupSubmissionSortMode(sortMode),
		DailyPreviews:  []domain.DailyReportPreview{weeklySubmissionPreview},
		SubmittedCount: len(submittedUserIDs),
		MissingCount:   len(missingUserIDs),
		OnLeaveCount:   len(onLeaveUserIDs),
		Markdown:       "",
	}

	calendarLabels := normalizeReportCalendarLabels(input.CalendarLabels)
	formatSettings, err := s.reportFormatSettingsForKind(ctx, domain.ID(cleanWorkspaceID), domain.ReportKindWeekly)
	if err != nil {
		return nil, err
	}
	if err := s.applyReportItemTimes(
		ctx,
		domain.ID(cleanWorkspaceID),
		periodStart,
		periodEnd,
		formatSettings.IncludeTime,
		&preview.DailyPreviews[0],
	); err != nil {
		return nil, err
	}

	userLabels := s.userLabelsForReport(ctx, collectWeeklyPreviewUserIDs(*preview))
	preview.Markdown = buildWeeklyReportMarkdown(
		*preview,
		userLabels,
		*workspace,
		calendarLabels,
		formatSettings.Language,
	)

	return preview, nil
}

/*
reportScheduleContext identifies the standup schedules that are eligible to feed
one report occurrence.
*/
type reportScheduleContext struct {
	OccurrenceDate domain.LocalDate
	ScheduleIDs    map[string]bool
}

/*
activeReportSchedulesForDate resolves active standup schedules for one report
kind and date. Report previews and post actions use this guard so report rules
cannot generate reports for dates where no matching standup was active.
*/
func (s *ReportService) activeReportSchedulesForDate(
	ctx context.Context,
	workspace domain.Workspace,
	configuration StandupConfiguration,
	reportKind domain.ReportKind,
	occurrenceDate domain.LocalDate,
) (*reportScheduleContext, error) {
	if _, err := parseLocalDate(occurrenceDate); err != nil {
		return nil, err
	}

	standupKind := standupKindForReportKind(reportKind)
	if standupKind == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Report kind is not connected to a standup kind.")
	}

	if err := s.standupService.requireStandupRunsForSubmission(ctx, workspace, occurrenceDate); err != nil {
		if serviceErr, ok := AsError(err); ok && serviceErr.Code == ErrorCodeValidationFailed {
			return nil, noActiveReportStandupError(reportKind, occurrenceDate)
		}

		return nil, err
	}

	activeTemplateIDs := templateIDSetForStandupKind(configuration.Templates, standupKind)
	activeScheduleIDs := map[string]bool{}
	for _, schedule := range configuration.Schedules {
		if !schedule.Enabled || schedule.Kind != standupKind {
			continue
		}

		if !activeTemplateIDs[schedule.TemplateID.String()] {
			continue
		}

		if err := s.standupService.requireScheduleAllowsSubmissionDate(
			ctx,
			workspace,
			schedule,
			configuration.Schedules,
			occurrenceDate,
		); err != nil {
			continue
		}

		activeScheduleIDs[schedule.ID.String()] = true
	}

	if len(activeScheduleIDs) == 0 {
		return nil, noActiveReportStandupError(reportKind, occurrenceDate)
	}

	return &reportScheduleContext{
		OccurrenceDate: occurrenceDate,
		ScheduleIDs:    activeScheduleIDs,
	}, nil
}

/*
activeWeeklyReportOccurrence finds the latest weekly standup occurrence inside a
manual report range. This lets Monday-Sunday browser ranges still pick the
workspace's real last-working-day weekly standup.
*/
func (s *ReportService) activeWeeklyReportOccurrence(
	ctx context.Context,
	workspace domain.Workspace,
	configuration StandupConfiguration,
	dates []domain.LocalDate,
) (*reportScheduleContext, error) {
	for index := len(dates) - 1; index >= 0; index -= 1 {
		contextForDate, err := s.activeReportSchedulesForDate(
			ctx,
			workspace,
			configuration,
			domain.ReportKindWeekly,
			dates[index],
		)
		if err == nil {
			return contextForDate, nil
		}

		if serviceErr, ok := AsError(err); !ok || serviceErr.Code != ErrorCodeValidationFailed {
			return nil, err
		}
	}

	return nil, NewError(ErrorCodeValidationFailed, "No weekly standup was active in the selected period.")
}

/*
standupKindForReportKind maps report kinds to the standup schedule kind that can
produce the report.
*/
func standupKindForReportKind(reportKind domain.ReportKind) domain.StandupKind {
	switch reportKind {
	case domain.ReportKindDaily:
		return domain.StandupKindDaily
	case domain.ReportKindWeekly:
		return domain.StandupKindWeekly
	default:
		return ""
	}
}

/*
templateIDSetForStandupKind returns active template IDs for one standup kind.
*/
func templateIDSetForStandupKind(
	templates []domain.StandupTemplate,
	standupKind domain.StandupKind,
) map[string]bool {
	ids := map[string]bool{}
	for _, template := range templates {
		if !template.IsActive || template.Kind != standupKind {
			continue
		}

		ids[template.ID.String()] = true
	}

	return ids
}

/*
filterReportSubmissionsBySchedule keeps only submissions tied to active schedules
for the report kind/date being rendered.
*/
func filterReportSubmissionsBySchedule(
	submissions []domain.StandupSubmissionWithAnswers,
	activeScheduleIDs map[string]bool,
) []domain.StandupSubmissionWithAnswers {
	filtered := make([]domain.StandupSubmissionWithAnswers, 0, len(submissions))
	for _, submission := range submissions {
		if activeScheduleIDs[submission.Submission.ScheduleID.String()] {
			filtered = append(filtered, submission)
		}
	}

	return filtered
}

/*
noActiveReportStandupError returns clear report-preview copy for inactive days.
*/
func noActiveReportStandupError(reportKind domain.ReportKind, occurrenceDate domain.LocalDate) error {
	switch reportKind {
	case domain.ReportKindDaily:
		return NewError(
			ErrorCodeValidationFailed,
			"No daily standup was active for this workspace on "+occurrenceDate.String()+".",
		)
	case domain.ReportKindWeekly:
		return NewError(
			ErrorCodeValidationFailed,
			"No weekly standup was active for this workspace on "+occurrenceDate.String()+".",
		)
	default:
		return NewError(ErrorCodeValidationFailed, "No standup was active for this report date.")
	}
}

/*
requireReportRuleScheduleActiveForDate enforces that the enabled report rule
being posted is attached to a standup schedule that is active for the resolved
report occurrence. This closes the gap between report-rule activation and actual
standup schedule activation.
*/
func (s *ReportService) requireReportRuleScheduleActiveForDate(
	ctx context.Context,
	actorUserID string,
	workspace domain.Workspace,
	reportRule domain.ReportRule,
	reportKind domain.ReportKind,
	occurrenceDate domain.LocalDate,
) error {
	configuration, err := s.standupService.ListConfiguration(ctx, ListStandupConfigurationInput{
		ActorUserID: actorUserID,
		WorkspaceID: workspace.ID.String(),
	})
	if err != nil {
		return err
	}

	scheduleContext, err := s.activeReportSchedulesForDate(
		ctx,
		workspace,
		*configuration,
		reportKind,
		occurrenceDate,
	)
	if err != nil {
		return err
	}

	if reportRuleScheduleIsActive(reportRule, scheduleContext) {
		return nil
	}

	switch reportKind {
	case domain.ReportKindDaily:
		return NewError(
			ErrorCodeValidationFailed,
			"The enabled daily report rule is not connected to an active daily standup schedule for this date.",
		)
	case domain.ReportKindWeekly:
		return NewError(
			ErrorCodeValidationFailed,
			"The enabled weekly report rule is not connected to an active weekly standup schedule for this period.",
		)
	default:
		return NewError(ErrorCodeValidationFailed, "The enabled report rule is not connected to an active standup schedule.")
	}
}

/*
reportRuleScheduleIsActive reports whether an enabled report rule points at an
active standup schedule for the resolved report occurrence.
*/
func reportRuleScheduleIsActive(reportRule domain.ReportRule, scheduleContext *reportScheduleContext) bool {
	if scheduleContext == nil {
		return false
	}

	return scheduleContext.ScheduleIDs[reportRule.ScheduleID.String()]
}

/*
ListDailyRuns returns recent daily report posting history for a workspace.
*/
func (s *ReportService) ListDailyRuns(
	ctx context.Context,
	input ListDailyReportRunsInput,
) ([]domain.ReportRun, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to view report history.")
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

	runs, err := s.reportStore.ListRunsByWorkspaceIDAndKind(
		ctx,
		workspaceID,
		domain.ReportKindDaily,
		input.Limit,
	)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load report history.")
	}

	return runs, nil
}

/*
PostWeeklyPreview builds a weekly report preview and posts it to the workspace channel.

It reserves a report run before posting so duplicate clicks are blocked by the
report run uniqueness constraint.
*/
func (s *ReportService) PostWeeklyPreview(
	ctx context.Context,
	input PostWeeklyReportPreviewInput,
) (*PostWeeklyReportPreviewResult, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to post weekly reports.")
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

	reportRule, err := s.reportStore.GetEnabledRuleByWorkspaceIDAndKind(
		ctx,
		workspaceID,
		domain.ReportKindWeekly,
	)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeValidationFailed, "No enabled weekly report rule is configured.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load weekly report rule.")
	}

	preview, err := s.BuildWeeklyPreview(ctx, BuildWeeklyReportPreviewInput{
		ActorUserID:    cleanActorUserID,
		WorkspaceID:    cleanWorkspaceID,
		PeriodStart:    input.PeriodStart,
		PeriodEnd:      input.PeriodEnd,
		SortMode:       firstNonEmptyReportString(input.SortMode, string(reportRule.SortMode)),
		CalendarLabels: input.CalendarLabels,
	})
	if err != nil {
		return nil, err
	}

	if len(preview.DailyPreviews) == 0 {
		return nil, NewError(ErrorCodeValidationFailed, "Weekly report preview is not connected to a weekly standup occurrence.")
	}

	if err := s.requireReportRuleScheduleActiveForDate(
		ctx,
		cleanActorUserID,
		*workspace,
		*reportRule,
		domain.ReportKindWeekly,
		preview.DailyPreviews[0].OccurrenceDate,
	); err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	run := domain.ReportRun{
		ID:           domain.ID(uuid.NewString()),
		WorkspaceID:  workspaceID,
		ReportRuleID: reportRule.ID,
		ScheduleID:   reportRule.ScheduleID,
		ReportKind:   domain.ReportKindWeekly,
		PeriodStart:  preview.PeriodStart,
		PeriodEnd:    preview.PeriodEnd,
		GeneratedAt:  now,
		PostedAt:     nil,
		PostedBy:     cleanActorUserID,
		Markdown:     preview.Markdown,
		Status:       domain.ReportRunStatusPosting,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	createdRun, err := s.reportStore.CreateRun(ctx, run)
	if err != nil {
		if !input.AllowRepost {
			return nil, NewError(ErrorCodeConflict, "This weekly report has already been posted or is currently posting.")
		}

		existingRun, existingErr := s.reportStore.GetRunByRuleAndPeriod(
			ctx,
			workspaceID,
			reportRule.ID,
			domain.ReportKindWeekly,
			preview.PeriodStart,
			preview.PeriodEnd,
		)
		if existingErr != nil {
			return nil, NewError(ErrorCodeInternal, "Could not load weekly report history for reposting.")
		}

		createdRun, err = s.reportStore.PrepareRunForRepost(
			ctx,
			existingRun.ID,
			cleanActorUserID,
			preview.Markdown,
			now,
		)
		if err != nil {
			return nil, NewError(ErrorCodeInternal, "Could not prepare weekly report for reposting.")
		}
	}

	postID, err := s.reportPublisher.PostWeeklyReport(ctx, WeeklyReportPost{
		WorkspaceID:    workspace.ID.String(),
		WorkspaceName:  workspace.Name,
		ChannelID:      workspace.ChannelID,
		PeriodStart:    preview.PeriodStart.String(),
		PeriodEnd:      preview.PeriodEnd.String(),
		Markdown:       preview.Markdown,
		PostedByUserID: cleanActorUserID,
	})
	if err != nil {
		_ = s.reportStore.MarkRunFailed(ctx, createdRun.ID, time.Now().UTC())

		return nil, NewError(ErrorCodeInternal, "Could not post weekly report to Mattermost.")
	}

	postedRun, err := s.reportStore.MarkRunPosted(ctx, createdRun.ID, postID, time.Now().UTC())
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not update weekly report history.")
	}

	return &PostWeeklyReportPreviewResult{
		Preview: *preview,
		Run:     *postedRun,
		Posted:  true,
	}, nil
}

/*
PostDailyPreview builds a daily report preview and posts it to the workspace channel.

It reserves a report run before posting so duplicate clicks are blocked by the
report run uniqueness constraint.
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

	reportRule, err := s.reportStore.GetEnabledRuleByWorkspaceIDAndKind(
		ctx,
		workspaceID,
		domain.ReportKindDaily,
	)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeValidationFailed, "No enabled daily report rule exists for this workspace.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load daily report rule.")
	}

	preview, err := s.BuildDailyPreview(ctx, BuildDailyReportPreviewInput{
		ActorUserID:    cleanActorUserID,
		WorkspaceID:    cleanWorkspaceID,
		OccurrenceDate: input.OccurrenceDate,
		SortMode:       firstNonEmptyReportString(input.SortMode, string(reportRule.SortMode)),
		CalendarLabels: input.CalendarLabels,
	})
	if err != nil {
		return nil, err
	}

	if err := s.requireReportRuleScheduleActiveForDate(
		ctx,
		cleanActorUserID,
		*workspace,
		*reportRule,
		domain.ReportKindDaily,
		preview.OccurrenceDate,
	); err != nil {
		return nil, err
	}

	if strings.TrimSpace(preview.Markdown) == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Daily report preview is empty.")
	}

	now := time.Now().UTC()
	reservedRun := domain.ReportRun{
		ID:               domain.ID(uuid.NewString()),
		WorkspaceID:      workspaceID,
		ReportRuleID:     reportRule.ID,
		ScheduleID:       reportRule.ScheduleID,
		ReportKind:       domain.ReportKindDaily,
		PeriodStart:      preview.OccurrenceDate,
		PeriodEnd:        preview.OccurrenceDate,
		GeneratedAt:      now,
		PostedAt:         nil,
		PostedBy:         cleanActorUserID,
		MattermostPostID: "",
		Markdown:         preview.Markdown,
		Status:           domain.ReportRunStatusPosting,
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	createdRun, err := s.reportStore.CreateRun(ctx, reservedRun)
	if err != nil {
		if !input.AllowRepost {
			return nil, NewError(ErrorCodeConflict, "Daily report was already posted or reserved for this date.")
		}

		existingRun, existingErr := s.reportStore.GetRunByRuleAndPeriod(
			ctx,
			workspaceID,
			reportRule.ID,
			domain.ReportKindDaily,
			preview.OccurrenceDate,
			preview.OccurrenceDate,
		)
		if existingErr != nil {
			return nil, NewError(ErrorCodeInternal, "Could not load daily report history for reposting.")
		}

		createdRun, err = s.reportStore.PrepareRunForRepost(
			ctx,
			existingRun.ID,
			cleanActorUserID,
			preview.Markdown,
			now,
		)
		if err != nil {
			return nil, NewError(ErrorCodeInternal, "Could not prepare daily report for reposting.")
		}
	}

	postID, err := s.reportPublisher.PostDailyReport(ctx, DailyReportPost{
		WorkspaceID:    workspace.ID.String(),
		WorkspaceName:  workspace.Name,
		ChannelID:      workspace.ChannelID,
		OccurrenceDate: preview.OccurrenceDate.String(),
		Markdown:       preview.Markdown,
		PostedByUserID: cleanActorUserID,
	})
	if err != nil {
		_ = s.reportStore.MarkRunFailed(ctx, createdRun.ID, time.Now().UTC())
		return nil, NewError(ErrorCodeInternal, "Could not post daily report to the channel.")
	}

	postedAt := time.Now().UTC()
	postedRun, err := s.reportStore.MarkRunPosted(ctx, createdRun.ID, postID, postedAt)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Daily report posted, but Campfire could not update report history.")
	}

	return &PostDailyReportPreviewResult{
		Preview: *preview,
		Run:     *postedRun,
		Posted:  true,
	}, nil
}

/*
PostDailyAutomated posts a daily report from scheduler automation.

Automation only posts when the enabled daily report rule:
- belongs to the due schedule,
- is configured to post to channel,
- does not require manual preview.

The method reuses PostDailyPreview so manual and automated posting share the
same report generation, publishing, and report-run idempotency path.
*/
func (s *ReportService) PostDailyAutomated(
	ctx context.Context,
	input PostDailyReportAutomationInput,
) (*PostDailyReportAutomationResult, error) {
	cleanWorkspaceID := strings.TrimSpace(input.WorkspaceID)
	if cleanWorkspaceID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
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
	scheduleID := domain.ID(cleanScheduleID)

	reportRule, err := s.reportStore.GetEnabledRuleByWorkspaceIDAndKind(
		ctx,
		workspaceID,
		domain.ReportKindDaily,
	)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return &PostDailyReportAutomationResult{
				Posted:        false,
				SkippedReason: "no_enabled_daily_report_rule",
				Run:           nil,
			}, nil
		}

		return nil, NewError(ErrorCodeInternal, "Could not load daily report rule.")
	}

	if reportRule.ScheduleID != scheduleID {
		return &PostDailyReportAutomationResult{
			Posted:        false,
			SkippedReason: "report_rule_not_for_schedule",
			Run:           nil,
		}, nil
	}

	if !reportRule.PostToChannel {
		return &PostDailyReportAutomationResult{
			Posted:        false,
			SkippedReason: "post_to_channel_disabled",
			Run:           nil,
		}, nil
	}

	if reportRule.PreviewRequired {
		return &PostDailyReportAutomationResult{
			Posted:        false,
			SkippedReason: "manual_preview_required",
			Run:           nil,
		}, nil
	}

	existingRun, err := s.reportStore.GetRunByRuleAndPeriod(
		ctx,
		workspaceID,
		reportRule.ID,
		domain.ReportKindDaily,
		occurrenceDate,
		occurrenceDate,
	)
	if err != nil && !errors.Is(err, store.ErrNotFound) {
		return nil, NewError(ErrorCodeInternal, "Could not check daily report history.")
	}

	if existingRun != nil {
		return &PostDailyReportAutomationResult{
			Posted:        false,
			SkippedReason: "already_processed",
			Run:           existingRun,
		}, nil
	}

	result, err := s.PostDailyPreview(ctx, PostDailyReportPreviewInput{
		ActorUserID:    reportAutomationActorUserID,
		IsSystemAdmin:  true,
		WorkspaceID:    cleanWorkspaceID,
		OccurrenceDate: occurrenceDate.String(),
		SortMode:       string(reportRule.SortMode),
	})
	if err != nil {
		return nil, err
	}

	return &PostDailyReportAutomationResult{
		Posted:        result.Posted,
		SkippedReason: "",
		Run:           &result.Run,
	}, nil
}

/*
PostWeeklyAutomated posts a weekly report from scheduler automation.

Automation only posts when the enabled weekly report rule:
- belongs to the due schedule,
- is configured to post to channel,
- does not require manual preview.

The caller supplies the weekly period so scheduler calendar logic stays outside
the report service.
*/
func (s *ReportService) PostWeeklyAutomated(
	ctx context.Context,
	input PostWeeklyReportAutomationInput,
) (*PostWeeklyReportAutomationResult, error) {
	cleanWorkspaceID := strings.TrimSpace(input.WorkspaceID)
	if cleanWorkspaceID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
	}

	cleanScheduleID := strings.TrimSpace(input.ScheduleID)
	if cleanScheduleID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Schedule ID is required.")
	}

	periodStart := domain.LocalDate(strings.TrimSpace(input.PeriodStart))
	if _, err := parseLocalDate(periodStart); err != nil {
		return nil, NewError(ErrorCodeValidationFailed, "Period start must be a real YYYY-MM-DD calendar date.")
	}

	periodEnd := domain.LocalDate(strings.TrimSpace(input.PeriodEnd))
	if _, err := parseLocalDate(periodEnd); err != nil {
		return nil, NewError(ErrorCodeValidationFailed, "Period end must be a real YYYY-MM-DD calendar date.")
	}

	if periodEnd.String() < periodStart.String() {
		return nil, NewError(ErrorCodeValidationFailed, "Period end cannot be before period start.")
	}

	workspaceID := domain.ID(cleanWorkspaceID)
	scheduleID := domain.ID(cleanScheduleID)

	reportRule, err := s.reportStore.GetEnabledRuleByWorkspaceIDAndKind(
		ctx,
		workspaceID,
		domain.ReportKindWeekly,
	)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return &PostWeeklyReportAutomationResult{
				Posted:        false,
				SkippedReason: "no_enabled_weekly_report_rule",
				Run:           nil,
			}, nil
		}

		return nil, NewError(ErrorCodeInternal, "Could not load weekly report rule.")
	}

	if reportRule.ScheduleID != scheduleID {
		return &PostWeeklyReportAutomationResult{
			Posted:        false,
			SkippedReason: "report_rule_not_for_schedule",
			Run:           nil,
		}, nil
	}

	if !reportRule.PostToChannel {
		return &PostWeeklyReportAutomationResult{
			Posted:        false,
			SkippedReason: "post_to_channel_disabled",
			Run:           nil,
		}, nil
	}

	if reportRule.PreviewRequired {
		return &PostWeeklyReportAutomationResult{
			Posted:        false,
			SkippedReason: "manual_preview_required",
			Run:           nil,
		}, nil
	}

	existingRun, err := s.reportStore.GetRunByRuleAndPeriod(
		ctx,
		workspaceID,
		reportRule.ID,
		domain.ReportKindWeekly,
		periodStart,
		periodEnd,
	)
	if err != nil && !errors.Is(err, store.ErrNotFound) {
		return nil, NewError(ErrorCodeInternal, "Could not check weekly report history.")
	}

	if existingRun != nil {
		return &PostWeeklyReportAutomationResult{
			Posted:        false,
			SkippedReason: "already_processed",
			Run:           existingRun,
		}, nil
	}

	result, err := s.PostWeeklyPreview(ctx, PostWeeklyReportPreviewInput{
		ActorUserID:   reportAutomationActorUserID,
		IsSystemAdmin: true,
		WorkspaceID:   cleanWorkspaceID,
		PeriodStart:   periodStart.String(),
		PeriodEnd:     periodEnd.String(),
		SortMode:      string(reportRule.SortMode),
	})
	if err != nil {
		return nil, err
	}

	return &PostWeeklyReportAutomationResult{
		Posted:        result.Posted,
		SkippedReason: "",
		Run:           &result.Run,
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
userLabelsForReport resolves Mattermost user IDs for report Markdown.

Report generation should not fail just because a historical user cannot be
resolved. Missing profiles fall back to the raw user ID.
*/
func (s *ReportService) userLabelsForReport(ctx context.Context, userIDs []string) map[string]string {
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
		if strings.TrimSpace(profile.ID) == "" {
			continue
		}

		labels[profile.ID] = userProfileReportLabel(profile)
	}

	return labels
}

/*
collectDailyPreviewUserIDs returns every user ID shown in one daily report.
*/
func collectDailyPreviewUserIDs(preview domain.DailyReportPreview) []string {
	userIDs := []string{}
	userIDs = append(userIDs, preview.SubmittedUserIDs...)
	userIDs = append(userIDs, preview.MissingUserIDs...)
	userIDs = append(userIDs, preview.OnLeaveUserIDs...)

	for _, row := range preview.Rows {
		userIDs = append(userIDs, row.UserID)
	}

	return normalizeUserIDs(userIDs)
}

/*
collectWeeklyPreviewUserIDs returns every user ID shown in one weekly report.
*/
func collectWeeklyPreviewUserIDs(preview domain.WeeklyReportPreview) []string {
	userIDs := []string{}

	for _, dailyPreview := range preview.DailyPreviews {
		userIDs = append(userIDs, collectDailyPreviewUserIDs(dailyPreview)...)
	}

	return normalizeUserIDs(userIDs)
}

/*
collectTimeSummaryUserIDs returns user IDs shown in an optional time summary.
*/
func collectTimeSummaryUserIDs(summary *domain.TimeReportSummary) []string {
	if summary == nil {
		return []string{}
	}

	userIDs := make([]string, 0, len(summary.Rows))
	for _, row := range summary.Rows {
		if strings.TrimSpace(row.UserID) != "" {
			userIDs = append(userIDs, row.UserID)
		}
	}

	return normalizeUserIDs(userIDs)
}

/*
userProfileReportLabel formats a Mattermost profile for report Markdown.
*/
func userProfileReportLabel(profile UserProfile) string {
	username := strings.TrimSpace(profile.Username)
	if username != "" {
		return "@" + username
	}

	displayName := strings.TrimSpace(profile.DisplayName)
	if displayName != "" {
		return displayName
	}

	return strings.TrimSpace(profile.ID)
}

/*
reportUserLabel returns a display label for one user ID.
*/
func reportUserLabel(userLabels map[string]string, userID string) string {
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
reportUserLabelForLanguage returns a report user label with optional RTL prefix.

Mattermost turns @username values into profile links. Persian and Arabic report
languages intentionally start visible user labels with RTL text so external RTL
rendering helpers can align the line correctly.
*/
func reportUserLabelForLanguage(userLabels map[string]string, userID string, copy reportCopy) string {
	label := reportUserLabel(userLabels, userID)
	if label == "" {
		return ""
	}

	prefix := strings.TrimSpace(copy.UserLinePrefix)
	if prefix == "" {
		return label
	}

	return prefix + " " + label
}

/*
localizedReportQuestionLabel translates Campfire's default standup prompts.

Custom question labels are left untouched so workspace-specific wording stays
exactly as the Lead configured it.
*/
func localizedReportQuestionLabel(label string, copy reportCopy) string {
	cleanLabel := strings.TrimSpace(label)
	switch strings.ToLower(cleanLabel) {
	case "yesterday / progress":
		return firstNonEmptyReportString(copy.YesterdayProgress, cleanLabel)
	case "today / plan":
		return firstNonEmptyReportString(copy.TodayPlan, cleanLabel)
	default:
		return cleanLabel
	}
}

/*
buildDailyReportRows maps standup submissions into report rows.
*/
/*
reportEmptyItemMinutes creates a zero-filled minutes slice aligned to report
answer items.
*/
func reportEmptyItemMinutes(items []string) []int {
	if len(items) == 0 {
		return []int{}
	}

	return make([]int, len(items))
}

/*
clearReportItemTimes removes item-level time labels from a daily preview.
*/
func clearReportItemTimes(preview *domain.DailyReportPreview) {
	if preview == nil {
		return
	}

	for rowIndex := range preview.Rows {
		for answerIndex := range preview.Rows[rowIndex].Answers {
			answer := &preview.Rows[rowIndex].Answers[answerIndex]
			answer.ValueItemMinutes = reportEmptyItemMinutes(answer.ValueItems)
		}
	}
}

/*
reportQuestionShouldShowTaskTime reports whether item-level tracked time should
be rendered next to answer rows for a question.

Campfire only shows item-level time for the completed-work/progress question.
Today/plan items may become tasks too, but they represent future work and should
not receive tracked-time labels in the report.
*/
func reportQuestionShouldShowTaskTime(question domain.StandupQuestion) bool {
	if !question.CreatesTasks {
		return false
	}

	label := strings.ToLower(strings.TrimSpace(question.Label))
	section := strings.ToLower(strings.TrimSpace(question.Section))
	prompt := strings.ToLower(strings.TrimSpace(question.Prompt))

	return label == "yesterday / progress" ||
		section == "progress" ||
		strings.Contains(prompt, "finish") ||
		strings.Contains(prompt, "progress")
}

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

			reportValue := answerValueJSONToReportValue(answer.ValueJSON)

			answerRows = append(answerRows, domain.DailyReportAnswerRow{
				QuestionID:       answer.QuestionID,
				QuestionLabel:    firstNonEmptyReportString(question.Prompt, question.Label, question.ID.String()),
				ValueText:        reportValue.Text,
				ValueItems:       reportValue.Items,
				ValueItemMinutes: reportEmptyItemMinutes(reportValue.Items),
				ShowItemTime:     reportQuestionShouldShowTaskTime(question),
				ShowInReport:     question.ShowInReport,
				IsPrivate:        question.IsPrivate,
				Position:         question.Position,
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
buildWeeklyReportMarkdown builds the Markdown weekly report body.
*/
func buildWeeklyReportMarkdown(
	preview domain.WeeklyReportPreview,
	userLabels map[string]string,
	workspace domain.Workspace,
	calendarLabels map[string]string,
	language domain.ReportLanguage,
) string {
	copy := reportCopyForLanguage(language)
	lines := []string{
		fmt.Sprintf(
			"# %s — %s → %s",
			copy.WeeklyTitle,
			formatReportDate(preview.PeriodStart, calendarLabels),
			formatReportDate(preview.PeriodEnd, calendarLabels),
		),
		"",
		fmt.Sprintf("**%s:** `%s`", copy.WorkspaceTimezone, reportTimezoneLabel(workspace.Timezone)),
		"",
	}

	appendReportMetricTable(&lines, 2, copy.Overview, []reportMetricRow{
		{Label: "✅ " + copy.UniqueSubmitted, Count: preview.SubmittedCount},
		{Label: "🔴 " + copy.UniqueMissing, Count: preview.MissingCount},
		{Label: "🟠 " + copy.OnApprovedLeave, Count: preview.OnLeaveCount},
	})

	if len(preview.DailyPreviews) == 0 {
		lines = append(lines, copy.NoSubmittedStandups, "")
		return strings.Join(lines, "\n")
	}

	weeklyPreview := preview.DailyPreviews[0]
	appendReportUserTable(&lines, 2, copy.Missing, copy.User, weeklyPreview.MissingUserIDs, userLabels, copy)
	appendReportUserTable(&lines, 2, copy.OnApprovedLeave, copy.User, weeklyPreview.OnLeaveUserIDs, userLabels, copy)
	appendReportSubmittedSection(&lines, weeklyPreview, userLabels, workspace, calendarLabels, 2, true, copy)

	return strings.TrimSpace(strings.Join(lines, "\n")) + "\n"
}

/*
buildDailyReportMarkdown builds the Markdown daily report body.
*/
func buildDailyReportMarkdown(
	preview domain.DailyReportPreview,
	userLabels map[string]string,
	workspace domain.Workspace,
	calendarLabels map[string]string,
	language domain.ReportLanguage,
) string {
	copy := reportCopyForLanguage(language)
	lines := []string{
		fmt.Sprintf("# %s — %s", copy.DailyTitle, formatReportDate(preview.OccurrenceDate, calendarLabels)),
		"",
		fmt.Sprintf("**%s:** `%s`", copy.WorkspaceTimezone, reportTimezoneLabel(workspace.Timezone)),
		"",
	}

	appendDailyReportSections(&lines, preview, userLabels, workspace, calendarLabels, 2, true, copy)

	return strings.TrimSpace(strings.Join(lines, "\n")) + "\n"
}

/*
appendDailyReportSections appends overview, attention, and submitted sections.
*/
func appendDailyReportSections(
	lines *[]string,
	preview domain.DailyReportPreview,
	userLabels map[string]string,
	workspace domain.Workspace,
	calendarLabels map[string]string,
	headingLevel int,
	includeSubmittedHeading bool,
	copy reportCopy,
) {
	appendReportMetricTable(lines, headingLevel, copy.Overview, []reportMetricRow{
		{Label: "✅ " + copy.Submitted, Count: len(preview.SubmittedUserIDs)},
		{Label: "🔴 " + copy.Missing, Count: len(preview.MissingUserIDs)},
		{Label: "🟠 " + copy.OnApprovedLeave, Count: len(preview.OnLeaveUserIDs)},
	})

	appendReportUserTable(lines, headingLevel, copy.Missing, copy.User, preview.MissingUserIDs, userLabels, copy)
	appendReportUserTable(lines, headingLevel, copy.OnApprovedLeave, copy.User, preview.OnLeaveUserIDs, userLabels, copy)
	appendReportSubmittedSection(lines, preview, userLabels, workspace, calendarLabels, headingLevel, includeSubmittedHeading, copy)
}

/*
appendReportMetricTable appends the compact count table Mattermost renders as Markdown.
*/
func appendReportMetricTable(lines *[]string, headingLevel int, title string, metrics []reportMetricRow) {
	if len(metrics) == 0 {
		return
	}

	headers := make([]string, 0, len(metrics))
	aligners := make([]string, 0, len(metrics))
	counts := make([]string, 0, len(metrics))

	for _, metric := range metrics {
		headers = append(headers, markdownTableCell(metric.Label))
		aligners = append(aligners, "---:")
		counts = append(counts, strconv.Itoa(metric.Count))
	}

	*lines = append(
		*lines,
		reportHeading(headingLevel, title),
		"",
		markdownTableRow(headers),
		markdownTableRow(aligners),
		markdownTableRow(counts),
		"",
	)
}

/*
appendReportUserTable appends a one-user-per-row table for status lists.
*/
func appendReportUserTable(
	lines *[]string,
	headingLevel int,
	title string,
	userHeader string,
	userIDs []string,
	userLabels map[string]string,
	copy reportCopy,
) {
	if len(userIDs) == 0 {
		return
	}

	*lines = append(*lines, reportHeading(headingLevel, title), "", "| # | "+markdownTableCell(userHeader)+" |", "| ---: | --- |")

	for index, userID := range userIDs {
		*lines = append(
			*lines,
			fmt.Sprintf(
				"| %d | %s |",
				index+1,
				markdownTableCell(reportUserLabelForLanguage(userLabels, userID, copy)),
			),
		)
	}

	*lines = append(*lines, "")
}

/*
appendReportSubmittedSection appends submitted answers with readable local times.
*/
func appendReportSubmittedSection(
	lines *[]string,
	preview domain.DailyReportPreview,
	userLabels map[string]string,
	workspace domain.Workspace,
	calendarLabels map[string]string,
	headingLevel int,
	includeHeading bool,
	copy reportCopy,
) {
	userHeadingLevel := headingLevel
	if includeHeading {
		*lines = append(*lines, reportHeading(headingLevel, copy.Submitted), "")
		userHeadingLevel = headingLevel + 1
	} else {
		userHeadingLevel = headingLevel + 1
	}

	if len(preview.Rows) == 0 {
		*lines = append(*lines, copy.NoSubmittedStandups, "")
		return
	}

	for _, row := range preview.Rows {
		*lines = append(
			*lines,
			reportHeading(userHeadingLevel, sanitizeMarkdownLine(reportUserLabelForLanguage(userLabels, row.UserID, copy))),
			formatReportSubmissionMeta(row.FirstSubmittedAt, row.LastUpdatedAt, workspace.Timezone, calendarLabels, copy),
			"",
		)

		if len(row.Answers) == 0 {
			*lines = append(*lines, "- "+copy.NoReportVisibleAnswers, "")
			continue
		}

		for _, answer := range row.Answers {
			appendReportAnswer(lines, userHeadingLevel+1, answer, copy)
		}

		*lines = append(*lines, "")
	}
}

/*
appendReportTimeSummary appends the optional time-tracking section when enabled
in the workspace report rule.
*/
func appendReportTimeSummary(
	lines *[]string,
	headingLevel int,
	summary *domain.TimeReportSummary,
	userLabels map[string]string,
	calendarLabels map[string]string,
	copy reportCopy,
) {
	if summary == nil {
		return
	}

	*lines = append(
		*lines,
		reportHeading(headingLevel, copy.TimeTracking),
		"",
		fmt.Sprintf("**%s:** %s", copy.TotalTracked, formatReportDuration(summary.TotalMinutes, copy)),
		"",
	)

	if len(summary.Rows) == 0 {
		*lines = append(*lines, copy.NoTimeEntries, "")
		return
	}

	*lines = append(
		*lines,
		fmt.Sprintf("| # | %s | %s | %s |", markdownTableCell(copy.Person), markdownTableCell(copy.Time), markdownTableCell(copy.Entries)),
		"| ---: | --- | ---: | ---: |",
	)
	for index, row := range summary.Rows {
		*lines = append(
			*lines,
			fmt.Sprintf(
				"| %d | %s | %s | %d |",
				index+1,
				markdownTableCell(timeReportPersonLabel(row, userLabels, copy)),
				markdownTableCell(formatReportDuration(row.Minutes, copy)),
				row.EntryCount,
			),
		)
	}

	if summary.StartDate != "" && summary.EndDate != "" {
		*lines = append(
			*lines,
			"",
			fmt.Sprintf(
				"_%s: %s → %s_",
				copy.Period,
				formatReportDate(summary.StartDate, calendarLabels),
				formatReportDate(summary.EndDate, calendarLabels),
			),
			"",
		)
		return
	}

	*lines = append(*lines, "")
}

/*
timeReportPersonLabel resolves a person-grouped time-report row to display copy.
*/
func timeReportPersonLabel(row domain.TimeReportRow, userLabels map[string]string, copy reportCopy) string {
	if strings.TrimSpace(row.UserID) != "" {
		return reportUserLabelForLanguage(userLabels, row.UserID, copy)
	}

	return firstNonEmptyReportString(row.Label, row.Key, copy.UnknownUser)
}

/*
formatReportDuration renders minutes as compact human-readable time.
*/
func formatReportDuration(minutes int, copy reportCopy) string {
	if minutes <= 0 {
		return "0" + copy.MinuteUnit
	}

	hours := minutes / 60
	remainingMinutes := minutes % 60

	if hours > 0 && remainingMinutes > 0 {
		return fmt.Sprintf("%d%s %d%s", hours, copy.HourUnit, remainingMinutes, copy.MinuteUnit)
	}

	if hours > 0 {
		return fmt.Sprintf("%d%s", hours, copy.HourUnit)
	}

	return fmt.Sprintf("%d%s", remainingMinutes, copy.MinuteUnit)
}

/*
formatReportSubmissionMeta renders submission timestamps as small inline copy
instead of a full table, keeping each submitted user section compact.
*/
func formatReportSubmissionMeta(
	firstSubmittedAt time.Time,
	lastUpdatedAt time.Time,
	timezone string,
	calendarLabels map[string]string,
	copy reportCopy,
) string {
	first := formatReportTime(firstSubmittedAt, timezone, calendarLabels)
	last := formatReportTime(lastUpdatedAt, timezone, calendarLabels)

	parts := []string{}
	if first != "" {
		parts = append(parts, copy.FirstSubmitted+": "+first)
	}
	if last != "" {
		parts = append(parts, copy.LastUpdated+": "+last)
	}

	if len(parts) == 0 {
		return ""
	}

	return "_" + strings.Join(parts, " · ") + "_"
}

/*
reportHeading builds a Markdown heading at a safe depth.
*/
func reportHeading(level int, title string) string {
	if level < 1 {
		level = 1
	}

	if level > 6 {
		level = 6
	}

	return fmt.Sprintf("%s %s", strings.Repeat("#", level), sanitizeMarkdownLine(title))
}

/*
appendReportAnswer appends one report-visible answer.
*/
func appendReportAnswer(lines *[]string, headingLevel int, answer domain.DailyReportAnswerRow, copy reportCopy) {
	cleanLabel := sanitizeMarkdownLine(localizedReportQuestionLabel(answer.QuestionLabel, copy))
	if cleanLabel == "" {
		cleanLabel = copy.Answer
	}

	if reportAnswerIsBlocker(cleanLabel) {
		appendReportBlockerAnswer(lines, headingLevel, answer, copy)
		return
	}

	if len(answer.ValueItems) > 0 {
		*lines = append(*lines, reportHeading(headingLevel, cleanLabel), "")
		for index, item := range answer.ValueItems {
			cleanItem := sanitizeMarkdownLine(item)
			if cleanItem == "" {
				continue
			}

			if answer.ShowItemTime && index < len(answer.ValueItemMinutes) && answer.ValueItemMinutes[index] > 0 {
				*lines = append(
					*lines,
					fmt.Sprintf("- **%s** — %s", formatReportDuration(answer.ValueItemMinutes[index], copy), cleanItem),
				)
				continue
			}

			*lines = append(*lines, fmt.Sprintf("- %s", cleanItem))
		}
		*lines = append(*lines, "")
		return
	}

	cleanValue := sanitizeMarkdownLine(answer.ValueText)
	if cleanValue == "" {
		return
	}

	*lines = append(*lines, fmt.Sprintf("- **%s:** %s", cleanLabel, cleanValue))
}

/*
appendReportBlockerAnswer appends blockers as a visually separate warning block.
*/
func appendReportBlockerAnswer(lines *[]string, headingLevel int, answer domain.DailyReportAnswerRow, copy reportCopy) {
	items := answer.ValueItems
	if len(items) == 0 && strings.TrimSpace(answer.ValueText) != "" {
		items = []string{answer.ValueText}
	}

	if len(items) == 0 {
		return
	}

	*lines = append(*lines, "", reportHeading(headingLevel, "🚨 "+copy.Blockers), "")
	for _, item := range items {
		cleanItem := sanitizeMarkdownLine(item)
		if cleanItem != "" {
			*lines = append(*lines, fmt.Sprintf("> 🔴 %s", cleanItem))
		}
	}
	*lines = append(*lines, "")
}

/*
reportAnswerIsBlocker reports whether a question should be rendered as a
separate blocker section instead of looking like a normal progress item.
*/
func reportAnswerIsBlocker(label string) bool {
	return strings.Contains(strings.ToLower(strings.TrimSpace(label)), "blocker")
}

type reportMetricRow struct {
	Label string
	Count int
}

/*
reportCopy contains generated report labels for one language.
*/
type reportCopy struct {
	DailyTitle             string
	WeeklyTitle            string
	WorkspaceTimezone      string
	Overview               string
	Submitted              string
	Missing                string
	OnApprovedLeave        string
	UniqueSubmitted        string
	UniqueMissing          string
	User                   string
	UserLinePrefix         string
	UnknownUser            string
	YesterdayProgress      string
	TodayPlan              string
	TimeTracking           string
	TotalTracked           string
	NoDailyReportData      string
	NoSubmittedStandups    string
	NoReportVisibleAnswers string
	NoTimeEntries          string
	FirstSubmitted         string
	LastUpdated            string
	Period                 string
	Person                 string
	Time                   string
	Entries                string
	HourUnit               string
	MinuteUnit             string
	Blockers               string
	Answer                 string
}

/*
reportCopyForLanguage returns generated report labels in the selected language.
*/
func reportCopyForLanguage(language domain.ReportLanguage) reportCopy {
	switch normalizeReportLanguage(language) {
	case domain.ReportLanguagePersian:
		return reportCopy{
			DailyTitle:             "گزارش روزانه",
			WeeklyTitle:            "گزارش هفتگی",
			WorkspaceTimezone:      "منطقه زمانی کاری",
			Overview:               "خلاصه",
			Submitted:              "ارسال‌شده",
			Missing:                "ارسال‌نشده",
			OnApprovedLeave:        "مرخصی تأییدشده",
			UniqueSubmitted:        "ارسال‌شده یکتا",
			UniqueMissing:          "ارسال‌نشده یکتا",
			User:                   "کاربر",
			UserLinePrefix:         "کاربر:",
			UnknownUser:            "کاربر ناشناس",
			YesterdayProgress:      "روز کاری قبل چه کاری انجام دادی؟",
			TodayPlan:              "امروز قرار است چه کاری انجام بدهی؟",
			TimeTracking:           "گزارش زمان",
			TotalTracked:           "زمان ثبت‌شده",
			NoDailyReportData:      "برای این بازه داده‌ای برای گزارش روزانه وجود ندارد.",
			NoSubmittedStandups:    "هنوز گزارشی ارسال نشده است.",
			NoReportVisibleAnswers: "پاسخ قابل نمایش در گزارش وجود ندارد.",
			NoTimeEntries:          "برای این بازه زمانی ثبت نشده است.",
			FirstSubmitted:         "اولین ارسال",
			LastUpdated:            "آخرین ویرایش",
			Period:                 "بازه",
			Person:                 "نفر",
			Time:                   "زمان",
			Entries:                "ثبت‌ها",
			HourUnit:               "ساعت",
			MinuteUnit:             "دقیقه",
			Blockers:               "موانع",
			Answer:                 "پاسخ",
		}
	case domain.ReportLanguageArabic:
		return reportCopy{
			DailyTitle:             "التقرير اليومي",
			WeeklyTitle:            "التقرير الأسبوعي",
			WorkspaceTimezone:      "المنطقة الزمنية",
			Overview:               "الملخص",
			Submitted:              "مُرسَل",
			Missing:                "غير مُرسَل",
			OnApprovedLeave:        "إجازة معتمدة",
			UniqueSubmitted:        "مُرسَل فريد",
			UniqueMissing:          "غير مُرسَل فريد",
			User:                   "المستخدم",
			UserLinePrefix:         "المستخدم:",
			UnknownUser:            "مستخدم غير معروف",
			YesterdayProgress:      "ماذا أنجزت في آخر يوم عمل؟",
			TodayPlan:              "ماذا ستفعل اليوم؟",
			TimeTracking:           "تتبع الوقت",
			TotalTracked:           "إجمالي الوقت المسجل",
			NoDailyReportData:      "لا توجد بيانات تقرير يومي لهذه الفترة.",
			NoSubmittedStandups:    "لا توجد تحديثات مرسلة بعد.",
			NoReportVisibleAnswers: "لا توجد إجابات ظاهرة في التقرير.",
			NoTimeEntries:          "لا توجد إدخالات وقت لهذه الفترة.",
			FirstSubmitted:         "أول إرسال",
			LastUpdated:            "آخر تحديث",
			Period:                 "الفترة",
			Person:                 "الشخص",
			Time:                   "الوقت",
			Entries:                "الإدخالات",
			HourUnit:               "س",
			MinuteUnit:             "د",
			Blockers:               "العوائق",
			Answer:                 "الإجابة",
		}
	default:
		return reportCopy{
			DailyTitle:             "Daily Standup",
			WeeklyTitle:            "Weekly Standup Summary",
			WorkspaceTimezone:      "Workspace timezone",
			Overview:               "Overview",
			Submitted:              "Submitted",
			Missing:                "Missing",
			OnApprovedLeave:        "On approved leave",
			UniqueSubmitted:        "Unique submitted",
			UniqueMissing:          "Unique missing",
			User:                   "User",
			UserLinePrefix:         "",
			UnknownUser:            "Unknown user",
			YesterdayProgress:      "What did you do last working day?",
			TodayPlan:              "What are you going to do today?",
			TimeTracking:           "Time tracking",
			TotalTracked:           "Total tracked",
			NoDailyReportData:      "No daily report data for this period.",
			NoSubmittedStandups:    "No submitted standups yet.",
			NoReportVisibleAnswers: "No report-visible answers.",
			NoTimeEntries:          "No time entries were logged for this period.",
			FirstSubmitted:         "First submitted",
			LastUpdated:            "Last updated",
			Period:                 "Period",
			Person:                 "Person",
			Time:                   "Time",
			Entries:                "Entries",
			HourUnit:               "h",
			MinuteUnit:             "m",
			Blockers:               "Blockers",
			Answer:                 "Answer",
		}
	}
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
reportAnswerValue keeps both compact and itemized representations.
*/
type reportAnswerValue struct {
	Text  string
	Items []string
}

/*
answerValueJSONToReportValue converts stored JSON answers into report text.

Text answers that contain Markdown list rows keep those rows as individual
items, which lets posted Mattermost reports render real bullet lists instead of
one concatenated blob.
*/
func answerValueJSONToReportValue(valueJSON string) reportAnswerValue {
	cleanValueJSON := strings.TrimSpace(valueJSON)
	if cleanValueJSON == "" || cleanValueJSON == "null" {
		return reportAnswerValue{}
	}

	var stringValue string
	if err := json.Unmarshal([]byte(cleanValueJSON), &stringValue); err == nil {
		return reportAnswerValueFromString(stringValue)
	}

	var boolValue bool
	if err := json.Unmarshal([]byte(cleanValueJSON), &boolValue); err == nil {
		if boolValue {
			return reportAnswerValue{Text: "Yes"}
		}

		return reportAnswerValue{Text: "No"}
	}

	var numberValue float64
	if err := json.Unmarshal([]byte(cleanValueJSON), &numberValue); err == nil {
		return reportAnswerValue{Text: strconv.FormatFloat(numberValue, 'f', -1, 64)}
	}

	var stringValues []string
	if err := json.Unmarshal([]byte(cleanValueJSON), &stringValues); err == nil {
		return reportAnswerValueFromItems(stringValues)
	}

	var rawValues []json.RawMessage
	if err := json.Unmarshal([]byte(cleanValueJSON), &rawValues); err == nil {
		items := make([]string, 0, len(rawValues))
		texts := make([]string, 0, len(rawValues))

		for _, rawValue := range rawValues {
			parsed := answerValueJSONToReportValue(string(rawValue))
			if len(parsed.Items) > 0 {
				items = append(items, parsed.Items...)
				continue
			}

			if strings.TrimSpace(parsed.Text) != "" {
				texts = append(texts, parsed.Text)
			}
		}

		if len(items) > 0 {
			items = append(items, texts...)
			return reportAnswerValueFromItems(items)
		}

		return reportAnswerValue{Text: strings.Join(texts, ", ")}
	}

	return reportAnswerValueFromString(cleanValueJSON)
}

/*
reportAnswerValueFromString formats one string answer for reports.
*/
func reportAnswerValueFromString(value string) reportAnswerValue {
	cleanValue := strings.TrimSpace(value)
	if cleanValue == "" {
		return reportAnswerValue{}
	}

	items := reportItemsFromText(cleanValue)
	if len(items) > 1 || textLooksLikeMarkdownList(cleanValue) {
		return reportAnswerValueFromItems(items)
	}

	return reportAnswerValue{Text: cleanValue}
}

/*
reportAnswerValueFromItems normalizes item arrays without losing order.
*/
func reportAnswerValueFromItems(values []string) reportAnswerValue {
	items := make([]string, 0, len(values))
	for _, value := range values {
		cleanValue := strings.TrimSpace(value)
		if cleanValue != "" {
			items = append(items, cleanValue)
		}
	}

	return reportAnswerValue{
		Text:  strings.Join(items, "\n"),
		Items: items,
	}
}

/*
reportItemsFromText splits multiline answer text into clean report items.
*/
func reportItemsFromText(value string) []string {
	lines := strings.Split(strings.ReplaceAll(value, "\r\n", "\n"), "\n")
	items := make([]string, 0, len(lines))

	for _, line := range lines {
		item := cleanReportListItem(line)
		if item != "" {
			items = append(items, item)
		}
	}

	return items
}

/*
textLooksLikeMarkdownList reports whether answer text contains list prefixes.
*/
func textLooksLikeMarkdownList(value string) bool {
	for _, line := range strings.Split(strings.ReplaceAll(value, "\r\n", "\n"), "\n") {
		cleanLine := strings.TrimSpace(line)
		if strings.HasPrefix(cleanLine, "- ") ||
			strings.HasPrefix(cleanLine, "* ") ||
			strings.HasPrefix(cleanLine, "• ") ||
			lineStartsWithNumberedListPrefix(cleanLine) {
			return true
		}
	}

	return false
}

/*
cleanReportListItem removes common Markdown list prefixes from one row.
*/
func cleanReportListItem(value string) string {
	line := strings.TrimSpace(value)
	line = strings.TrimLeft(line, "-*• ")

	for index, char := range line {
		if char == '.' || char == ')' {
			prefix := line[:index]
			if prefix != "" && allReportASCIIDigits(prefix) {
				return strings.TrimSpace(line[index+1:])
			}
			break
		}

		if char < '0' || char > '9' {
			break
		}
	}

	return strings.TrimSpace(line)
}

/*
lineStartsWithNumberedListPrefix reports whether a line starts with 1. or 1).
*/
func lineStartsWithNumberedListPrefix(value string) bool {
	for index, char := range value {
		if char != '.' && char != ')' {
			if char < '0' || char > '9' {
				return false
			}

			continue
		}

		return index > 0 && allReportASCIIDigits(value[:index])
	}

	return false
}

/*
allReportASCIIDigits reports whether a string contains only ASCII digits.
*/
func allReportASCIIDigits(value string) bool {
	if value == "" {
		return false
	}

	for _, char := range value {
		if char < '0' || char > '9' {
			return false
		}
	}

	return true
}

const reportAutomationActorUserID = "campfire-report-automation"

/*
requireReportWorkspace validates that a report workspace exists.
*/
func (s *ReportService) requireReportWorkspace(ctx context.Context, workspaceID string) (domain.ID, error) {
	workspace, err := s.loadReportWorkspace(ctx, workspaceID)
	if err != nil {
		return "", err
	}

	return workspace.ID, nil
}

/*
loadReportWorkspace validates and loads one report workspace.
*/
func (s *ReportService) loadReportWorkspace(ctx context.Context, workspaceID string) (*domain.Workspace, error) {
	cleanWorkspaceID := strings.TrimSpace(workspaceID)
	if cleanWorkspaceID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
	}

	workspace, err := s.workspaceStore.GetByID(ctx, domain.ID(cleanWorkspaceID))
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Workspace was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load workspace.")
	}

	return workspace, nil
}

/*
isValidReportSortMode returns true when Campfire supports the sort mode.
*/
func isValidReportSortMode(sortMode domain.ReportSortMode) bool {
	switch sortMode {
	case domain.ReportSortName,
		domain.ReportSortFirstSubmitted,
		domain.ReportSortLastSubmitted,
		domain.ReportSortBlockersFirst:
		return true
	default:
		return false
	}
}

/*
normalizeReportLanguage returns a safe report language value.
*/
func normalizeReportLanguage(language domain.ReportLanguage) domain.ReportLanguage {
	switch language {
	case domain.ReportLanguagePersian, domain.ReportLanguageArabic:
		return language
	default:
		return domain.ReportLanguageEnglish
	}
}

/*
isValidReportLanguage returns true when Campfire can render generated report copy in the language.
*/
func isValidReportLanguage(language domain.ReportLanguage) bool {
	switch language {
	case domain.ReportLanguageEnglish,
		domain.ReportLanguagePersian,
		domain.ReportLanguageArabic:
		return true
	default:
		return false
	}
}

/*
preferredReportRuleForKind returns a report rule for display settings.

Enabled rules win because they are the active automation contract. If the rule is
currently disabled, the first matching row still carries manual-preview display
preferences such as report language.
*/
func preferredReportRuleForKind(rules []domain.ReportRule, reportKind domain.ReportKind) *domain.ReportRule {
	var fallback *domain.ReportRule

	for _, rule := range rules {
		if rule.ReportKind != reportKind {
			continue
		}

		candidate := rule
		if candidate.Enabled {
			return &candidate
		}

		if fallback == nil {
			fallback = &candidate
		}
	}

	return fallback
}

/*
findReportRule returns one report rule by ID.
*/
func findReportRule(rules []domain.ReportRule, reportRuleID domain.ID) *domain.ReportRule {
	for _, rule := range rules {
		if rule.ID == reportRuleID {
			found := rule
			return &found
		}
	}

	return nil
}

/*
datesInInclusiveRange returns every local date in an inclusive date range.
*/
func datesInInclusiveRange(startDate domain.LocalDate, endDate domain.LocalDate) ([]domain.LocalDate, error) {
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
formatReportDate formats one canonical local date with a browser-provided alternate calendar hint.
*/
func formatReportDate(date domain.LocalDate, calendarLabels map[string]string) string {
	formatted := date.String()
	if calendarLabel := reportCalendarLabelForDate(date, calendarLabels); calendarLabel != "" {
		return fmt.Sprintf("%s (%s)", formatted, calendarLabel)
	}

	return formatted
}

/*
reportTimezoneLabel returns the visible timezone label for Markdown reports.
*/
func reportTimezoneLabel(timezone string) string {
	cleanTimezone := strings.TrimSpace(timezone)
	if cleanTimezone == "" {
		return "UTC"
	}

	return cleanTimezone
}

/*
reportLocation loads the workspace location for timestamp rendering.
*/
func reportLocation(timezone string) *time.Location {
	location, err := time.LoadLocation(reportTimezoneLabel(timezone))
	if err != nil {
		return time.UTC
	}

	return location
}

/*
normalizeReportCalendarLabels sanitizes display-only browser-generated labels.

These labels are deliberately untrusted: Campfire only uses them as Markdown
decoration. All report filtering, schedule logic, and permission checks still use
validated Gregorian YYYY-MM-DD values computed on the server.
*/
func normalizeReportCalendarLabels(labels map[string]string) map[string]string {
	if len(labels) == 0 {
		return map[string]string{}
	}

	normalized := map[string]string{}
	for date, label := range labels {
		if len(normalized) >= 32 {
			break
		}

		cleanDate := domain.LocalDate(strings.TrimSpace(date))
		if _, err := parseLocalDate(cleanDate); err != nil {
			continue
		}

		cleanLabel := normalizeCalendarDisplayLabel(sanitizeMarkdownLine(label))
		if cleanLabel == "" {
			continue
		}

		if len([]rune(cleanLabel)) > 80 {
			continue
		}

		normalized[cleanDate.String()] = cleanLabel
	}

	return normalized
}

/*
normalizeCalendarDisplayLabel removes calendar-name prefixes from browser labels.

The report already makes the alternate calendar obvious by putting the label in
parentheses after the Gregorian date, so strings like "Persian:" or "Hijri:"
only add visual noise.
*/
func normalizeCalendarDisplayLabel(label string) string {
	cleanLabel := strings.TrimSpace(label)
	prefixes := []string{
		"Persian:",
		"persian:",
		"Hijri:",
		"hijri:",
		"Islamic:",
		"islamic:",
		"Arabic:",
		"arabic:",
	}

	for _, prefix := range prefixes {
		if strings.HasPrefix(cleanLabel, prefix) {
			return strings.TrimSpace(strings.TrimPrefix(cleanLabel, prefix))
		}
	}

	return cleanLabel
}

/*
reportCalendarLabelForDate returns one sanitized display-only label for a date.
*/
func reportCalendarLabelForDate(date domain.LocalDate, labels map[string]string) string {
	if len(labels) == 0 {
		return ""
	}

	return strings.TrimSpace(labels[date.String()])
}

/*
markdownTableRow renders one Markdown table row from already-sanitized cells.
*/
func markdownTableRow(cells []string) string {
	return "| " + strings.Join(cells, " | ") + " |"
}

func markdownTableCell(value string) string {
	cleanValue := sanitizeMarkdownLine(value)
	cleanValue = strings.ReplaceAll(cleanValue, "|", "\\|")

	return cleanValue
}

/*
formatReportTime formats a report timestamp in the workspace timezone.
*/
func formatReportTime(value time.Time, timezone string, calendarLabels map[string]string) string {
	if value.IsZero() {
		return ""
	}

	location := reportLocation(timezone)
	localTime := value.In(location)
	localDate := domain.LocalDate(localTime.Format("2006-01-02"))
	formatted := localTime.Format("2006-01-02 15:04")

	if calendarLabel := reportCalendarLabelForDate(localDate, calendarLabels); calendarLabel != "" {
		return fmt.Sprintf("%s (%s)", formatted, calendarLabel)
	}

	return formatted
}
