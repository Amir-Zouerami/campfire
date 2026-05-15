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
	standupService     *StandupService
	workspaceStore     store.WorkspaceStore
	workspaceRoleStore store.WorkspaceRoleStore
	reportStore        store.ReportStore
	reportPublisher    ReportPublisher
}

/*
NewReportService creates a report service.
*/
func NewReportService(
	standupService *StandupService,
	workspaceStore store.WorkspaceStore,
	workspaceRoleStore store.WorkspaceRoleStore,
	reportStore store.ReportStore,
	reportPublisher ReportPublisher,
) *ReportService {
	return &ReportService{
		standupService:     standupService,
		workspaceStore:     workspaceStore,
		workspaceRoleStore: workspaceRoleStore,
		reportStore:        reportStore,
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

The weekly preview combines daily report previews across an inclusive date range.
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

	dailyPreviews := make([]domain.DailyReportPreview, 0, len(dates))
	submittedUserIDs := map[string]bool{}
	missingUserIDs := map[string]bool{}
	onLeaveUserIDs := map[string]bool{}

	for _, date := range dates {
		dailyPreview, err := s.BuildDailyPreview(ctx, BuildDailyReportPreviewInput{
			ActorUserID:    cleanActorUserID,
			WorkspaceID:    cleanWorkspaceID,
			OccurrenceDate: date.String(),
			SortMode:       sortMode,
		})
		if err != nil {
			return nil, err
		}

		dailyPreviews = append(dailyPreviews, *dailyPreview)

		for _, userID := range dailyPreview.SubmittedUserIDs {
			submittedUserIDs[userID] = true
		}

		for _, userID := range dailyPreview.MissingUserIDs {
			missingUserIDs[userID] = true
		}

		for _, userID := range dailyPreview.OnLeaveUserIDs {
			onLeaveUserIDs[userID] = true
		}
	}

	preview := &domain.WeeklyReportPreview{
		WorkspaceID:    domain.ID(cleanWorkspaceID),
		PeriodStart:    periodStart,
		PeriodEnd:      periodEnd,
		SortMode:       domain.StandupSubmissionSortMode(sortMode),
		DailyPreviews:  dailyPreviews,
		SubmittedCount: len(submittedUserIDs),
		MissingCount:   len(missingUserIDs),
		OnLeaveCount:   len(onLeaveUserIDs),
		Markdown:       "",
	}

	preview.Markdown = buildWeeklyReportMarkdown(*preview)

	return preview, nil
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
		ActorUserID: cleanActorUserID,
		WorkspaceID: cleanWorkspaceID,
		PeriodStart: input.PeriodStart,
		PeriodEnd:   input.PeriodEnd,
		SortMode:    firstNonEmptyReportString(input.SortMode, string(reportRule.SortMode)),
	})
	if err != nil {
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
		return nil, NewError(ErrorCodeConflict, "This weekly report has already been posted or is currently posting.")
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
	})
	if err != nil {
		return nil, err
	}

	if strings.TrimSpace(preview.Markdown) == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Daily report preview is empty.")
	}

	existingRun, err := s.reportStore.GetRunByRuleAndPeriod(
		ctx,
		workspaceID,
		reportRule.ID,
		domain.ReportKindDaily,
		preview.OccurrenceDate,
		preview.OccurrenceDate,
	)
	if err != nil && !errors.Is(err, store.ErrNotFound) {
		return nil, NewError(ErrorCodeInternal, "Could not check daily report history.")
	}

	if existingRun != nil && existingRun.Status == domain.ReportRunStatusPosted {
		return nil, NewError(ErrorCodeConflict, "Daily report was already posted for this date.")
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
		return nil, NewError(ErrorCodeConflict, "Daily report was already posted or reserved for this date.")
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
buildWeeklyReportMarkdown builds the Markdown weekly report body.
*/
func buildWeeklyReportMarkdown(preview domain.WeeklyReportPreview) string {
	lines := []string{
		fmt.Sprintf("# Weekly Standup Summary — %s → %s", preview.PeriodStart.String(), preview.PeriodEnd.String()),
		"",
		fmt.Sprintf("- Unique submitted users: %d", preview.SubmittedCount),
		fmt.Sprintf("- Unique missing users: %d", preview.MissingCount),
		fmt.Sprintf("- Unique users on approved leave: %d", preview.OnLeaveCount),
		"",
	}

	if len(preview.DailyPreviews) == 0 {
		lines = append(lines, "No daily report data for this period.", "")
		return strings.Join(lines, "\n")
	}

	for _, dailyPreview := range preview.DailyPreviews {
		lines = append(lines,
			fmt.Sprintf("## %s", dailyPreview.OccurrenceDate.String()),
			"",
			fmt.Sprintf("- Submitted: %d", len(dailyPreview.SubmittedUserIDs)),
			fmt.Sprintf("- Missing: %d", len(dailyPreview.MissingUserIDs)),
			fmt.Sprintf("- On approved leave: %d", len(dailyPreview.OnLeaveUserIDs)),
			"",
		)

		if len(dailyPreview.Rows) == 0 {
			lines = append(lines, "No submitted standups.", "")
			continue
		}

		for _, row := range dailyPreview.Rows {
			lines = append(lines, fmt.Sprintf("### %s", sanitizeMarkdownLine(row.UserID)))

			for _, answer := range row.Answers {
				if strings.TrimSpace(answer.ValueText) == "" {
					continue
				}

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
	}

	return strings.Join(lines, "\n")
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

const reportAutomationActorUserID = "campfire-report-automation"

/*
requireReportWorkspace validates that a report workspace exists.
*/
func (s *ReportService) requireReportWorkspace(ctx context.Context, workspaceID string) (domain.ID, error) {
	cleanWorkspaceID := strings.TrimSpace(workspaceID)
	if cleanWorkspaceID == "" {
		return "", NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
	}

	id := domain.ID(cleanWorkspaceID)
	if _, err := s.workspaceStore.GetByID(ctx, id); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return "", NewError(ErrorCodeNotFound, "Workspace was not found.")
		}

		return "", NewError(ErrorCodeInternal, "Could not load workspace.")
	}

	return id, nil
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
formatReportTime formats report timestamps in UTC for deterministic previews.
*/
func formatReportTime(value time.Time) string {
	if value.IsZero() {
		return ""
	}

	return value.UTC().Format(time.RFC3339)
}
