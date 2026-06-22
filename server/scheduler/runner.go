package scheduler

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/logger"
	"github.com/amir-zouerami/campfire/server/service"
)

/*
WorkspaceProvider defines the workspace reads needed by the scheduler.

The runner depends on this small interface instead of a concrete SQL store.
*/
type WorkspaceProvider interface {
	ListActive(ctx context.Context) ([]domain.Workspace, error)
}

/*
StandupScheduleProvider defines the standup schedule reads needed by the scheduler.
*/
type StandupScheduleProvider interface {
	ListSchedulesByWorkspaceID(ctx context.Context, workspaceID domain.ID) ([]domain.StandupSchedule, error)
}

/*
ReminderRuleProvider defines the reminder rule reads needed by the scheduler.
*/
type ReminderRuleProvider interface {
	ListByWorkspaceID(ctx context.Context, workspaceID domain.ID) ([]domain.ReminderRule, error)
}

/*
StandupRuntimeProvider defines the runtime eligibility decision needed by the scheduler.
*/
type StandupRuntimeProvider interface {
	EvaluateDay(
		ctx context.Context,
		input service.EvaluateStandupDayInput,
	) (*domain.StandupRunDecision, error)
}

/*
ReminderSequenceExecutor defines reminder execution behavior used by the scheduler.
*/
type ReminderSequenceExecutor interface {
	ExecuteOpeningAnnouncement(
		ctx context.Context,
		input service.ExecuteOpeningAnnouncementInput,
	) (*service.ExecuteOpeningAnnouncementResult, error)

	ExecuteSequence(
		ctx context.Context,
		input service.ExecuteReminderSequenceInput,
	) (*service.ExecuteReminderSequenceResult, error)
}

/*
ReportAutomationExecutor defines automated report posting behavior used by the scheduler.
*/
type ReportAutomationExecutor interface {
	PostDailyAutomated(
		ctx context.Context,
		input service.PostDailyReportAutomationInput,
	) (*service.PostDailyReportAutomationResult, error)

	PostWeeklyAutomated(
		ctx context.Context,
		input service.PostWeeklyReportAutomationInput,
	) (*service.PostWeeklyReportAutomationResult, error)
}

/*
Config contains dependencies and timing options for the scheduler runner.
*/
type Config struct {
	Logger                   logger.Logger
	WorkspaceProvider        WorkspaceProvider
	StandupScheduleProvider  StandupScheduleProvider
	ReminderRuleProvider     ReminderRuleProvider
	StandupRuntimeProvider   StandupRuntimeProvider
	ReminderSequenceExecutor ReminderSequenceExecutor
	ReportAutomationExecutor ReportAutomationExecutor
	Interval                 time.Duration
}

/*
Runner owns Campfire's background scheduler loop.
*/
type Runner struct {
	logger                   logger.Logger
	workspaceProvider        WorkspaceProvider
	standupScheduleProvider  StandupScheduleProvider
	reminderRuleProvider     ReminderRuleProvider
	standupRuntimeProvider   StandupRuntimeProvider
	reminderSequenceExecutor ReminderSequenceExecutor
	reportAutomationExecutor ReportAutomationExecutor
	interval                 time.Duration

	mutex  sync.Mutex
	cancel context.CancelFunc
	done   chan struct{}
}

/*
NewRunner creates a scheduler runner.
*/
func NewRunner(config Config) *Runner {
	interval := config.Interval
	if interval <= 0 {
		interval = time.Minute
	}

	return &Runner{
		logger:                   config.Logger,
		workspaceProvider:        config.WorkspaceProvider,
		standupScheduleProvider:  config.StandupScheduleProvider,
		reminderRuleProvider:     config.ReminderRuleProvider,
		standupRuntimeProvider:   config.StandupRuntimeProvider,
		reminderSequenceExecutor: config.ReminderSequenceExecutor,
		reportAutomationExecutor: config.ReportAutomationExecutor,
		interval:                 interval,
		done:                     make(chan struct{}),
	}
}

/*
Start starts the scheduler loop.

Calling Start more than once is safe.
*/
func (r *Runner) Start() {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	if r.cancel != nil {
		return
	}

	ctx, cancel := context.WithCancel(context.Background())
	r.cancel = cancel
	r.done = make(chan struct{})

	go r.run(ctx)

	r.logger.Info("Campfire scheduler started")
}

/*
Stop stops the scheduler loop and waits for it to exit.

Calling Stop before Start or more than once is safe.
*/
func (r *Runner) Stop() {
	r.mutex.Lock()
	cancel := r.cancel
	done := r.done
	r.cancel = nil
	r.mutex.Unlock()

	if cancel == nil {
		return
	}

	cancel()
	<-done

	r.logger.Info("Campfire scheduler stopped")
}

/*
run executes scheduler ticks until the runner is stopped.
*/
func (r *Runner) run(ctx context.Context) {
	defer close(r.done)

	ticker := time.NewTicker(r.interval)
	defer ticker.Stop()

	r.tick(ctx, time.Now().UTC())

	for {
		select {
		case <-ctx.Done():
			return

		case tickTime := <-ticker.C:
			r.tick(ctx, tickTime.UTC())
		}
	}
}

/*
tick performs one scheduler pass.
*/
func (r *Runner) tick(ctx context.Context, now time.Time) {
	if !r.isConfigured() {
		r.logger.Warn("scheduler dependencies are not fully configured")
		return
	}

	workspaces, err := r.workspaceProvider.ListActive(ctx)
	if err != nil {
		r.logger.Warn("scheduler failed to load active workspaces", logger.String("error", err.Error()))
		return
	}

	for _, workspace := range workspaces {
		r.tickWorkspace(ctx, workspace, now)
	}
}

/*
isConfigured returns true when all scheduler dependencies are present.
*/
func (r *Runner) isConfigured() bool {
	return r.workspaceProvider != nil &&
		r.standupScheduleProvider != nil &&
		r.reminderRuleProvider != nil &&
		r.standupRuntimeProvider != nil &&
		r.reminderSequenceExecutor != nil &&
		r.reportAutomationExecutor != nil
}

/*
tickWorkspace evaluates due reminders for one workspace.
*/
func (r *Runner) tickWorkspace(ctx context.Context, workspace domain.Workspace, now time.Time) {
	location, err := loadWorkspaceLocation(workspace.Timezone)
	if err != nil {
		r.logger.Warn(
			"scheduler could not load workspace timezone",
			logger.String("workspace_id", workspace.ID.String()),
			logger.String("timezone", workspace.Timezone),
			logger.String("error", err.Error()),
		)
		return
	}

	localNow := now.In(location)
	occurrenceDate := domain.LocalDate(localNow.Format("2006-01-02"))

	decision, err := r.standupRuntimeProvider.EvaluateDay(ctx, service.EvaluateStandupDayInput{
		ActorUserID: schedulerActorUserID,
		WorkspaceID: workspace.ID.String(),
		Date:        occurrenceDate.String(),
	})
	if err != nil {
		r.logger.Warn(
			"scheduler failed to evaluate standup runtime",
			logger.String("workspace_id", workspace.ID.String()),
			logger.String("date", occurrenceDate.String()),
			logger.String("error", err.Error()),
		)
		return
	}

	if !decision.ShouldRun {
		r.logger.Debug(
			"scheduler skipped workspace because standup runtime is not due",
			logger.String("workspace_id", workspace.ID.String()),
			logger.String("date", occurrenceDate.String()),
			logger.String("reason", string(decision.Reason)),
		)
		return
	}

	schedules, err := r.standupScheduleProvider.ListSchedulesByWorkspaceID(ctx, workspace.ID)
	if err != nil {
		r.logger.Warn(
			"scheduler failed to load workspace standup schedules",
			logger.String("workspace_id", workspace.ID.String()),
			logger.String("error", err.Error()),
		)
		return
	}

	rules, err := r.reminderRuleProvider.ListByWorkspaceID(ctx, workspace.ID)
	if err != nil {
		r.logger.Warn(
			"scheduler failed to load workspace reminder rules",
			logger.String("workspace_id", workspace.ID.String()),
			logger.String("error", err.Error()),
		)
		return
	}

	rulesByScheduleID := rulesByScheduleID(rules)

	for _, schedule := range schedules {
		if !schedule.Enabled {
			continue
		}

		if !scheduleRunsOnDecisionDate(schedule, decision) {
			r.logger.Debug(
				"scheduler skipped schedule because it is not due on this workspace date",
				logger.String("workspace_id", workspace.ID.String()),
				logger.String("schedule_id", schedule.ID.String()),
				logger.String("schedule_kind", string(schedule.Kind)),
				logger.String("weekly_mode", string(schedule.WeeklyMode)),
				logger.String("date", occurrenceDate.String()),
			)
			continue
		}

		r.executeDueScheduleOpening(ctx, workspace, schedule, occurrenceDate, localNow)
		r.executeDueScheduleReport(ctx, workspace, schedule, occurrenceDate, localNow)

		for _, rule := range rulesByScheduleID[schedule.ID] {
			if !rule.Enabled {
				continue
			}

			r.executeDueReminderSequences(ctx, workspace, schedule, rule, occurrenceDate, localNow)
		}
	}
}

/*
scheduleRunsOnDecisionDate applies schedule-specific calendar rules after the
workspace-level runtime decision has already confirmed that the date can run.

Weekly schedules currently support only the last-working-day mode, so their
opening announcement, reminder sequences, and automated report must all be
skipped until the workspace runtime marks the date as the local week's final
working day.
*/
func scheduleRunsOnDecisionDate(
	schedule domain.StandupSchedule,
	decision *domain.StandupRunDecision,
) bool {
	if decision == nil || !decision.ShouldRun {
		return false
	}

	switch schedule.Kind {
	case domain.StandupKindDaily:
		return true

	case domain.StandupKindWeekly:
		return schedule.WeeklyMode == domain.WeeklyModeLastWorkingDay && decision.IsLastWorkingDayOfWeek

	default:
		return true
	}
}

/*
executeDueScheduleOpening posts the channel-only opening announcement when a
standup window opens. Opening announcements are not reminder sequences and never
send direct messages.
*/
func (r *Runner) executeDueScheduleOpening(
	ctx context.Context,
	workspace domain.Workspace,
	schedule domain.StandupSchedule,
	occurrenceDate domain.LocalDate,
	localNow time.Time,
) {
	openTime, err := scheduleTimeForDate(localNow, schedule.OpensAt)
	if err != nil {
		r.logger.Warn(
			"scheduler could not parse standup open time",
			logger.String("workspace_id", workspace.ID.String()),
			logger.String("schedule_id", schedule.ID.String()),
			logger.String("opens_at", schedule.OpensAt.String()),
			logger.String("error", err.Error()),
		)
		return
	}

	if !sameLocalMinute(localNow, openTime) {
		return
	}

	result, err := r.reminderSequenceExecutor.ExecuteOpeningAnnouncement(ctx, service.ExecuteOpeningAnnouncementInput{
		WorkspaceID:    workspace.ID.String(),
		ScheduleID:     schedule.ID.String(),
		ScheduleKind:   schedule.Kind,
		OccurrenceDate: occurrenceDate.String(),
	})
	if err != nil {
		r.logger.Warn(
			"scheduler failed to send standup opening announcement",
			logger.String("workspace_id", workspace.ID.String()),
			logger.String("schedule_id", schedule.ID.String()),
			logger.String("error", err.Error()),
		)
		return
	}

	if result == nil || !result.Sent {
		r.logger.Debug(
			"scheduler skipped standup opening announcement",
			logger.String("workspace_id", workspace.ID.String()),
			logger.String("schedule_id", schedule.ID.String()),
		)
		return
	}

	r.logger.Debug(
		"scheduler sent standup opening announcement",
		logger.String("workspace_id", workspace.ID.String()),
		logger.String("schedule_id", schedule.ID.String()),
	)
}

/*
executeDueReminderSequences executes reminder sequences due in the current local minute.

A schedule's OpensAt is the standup opening time and TimeOfDay is the close/report-posting time. Reminder offsets are minute marks after OpensAt.
*/
func (r *Runner) executeDueReminderSequences(
	ctx context.Context,
	workspace domain.Workspace,
	schedule domain.StandupSchedule,
	rule domain.ReminderRule,
	occurrenceDate domain.LocalDate,
	localNow time.Time,
) {
	offsets := decodeReminderOffsets(rule.ReminderOffsetsJSON)
	if len(offsets) == 0 {
		return
	}

	reportTime, err := scheduleTimeForDate(localNow, schedule.TimeOfDay)
	if err != nil {
		r.logger.Warn(
			"scheduler could not parse standup report time",
			logger.String("workspace_id", workspace.ID.String()),
			logger.String("schedule_id", schedule.ID.String()),
			logger.String("time_of_day", schedule.TimeOfDay.String()),
			logger.String("error", err.Error()),
		)
		return
	}

	openTime, err := scheduleTimeForDate(localNow, schedule.OpensAt)
	if err != nil {
		r.logger.Warn(
			"scheduler could not parse standup open time",
			logger.String("workspace_id", workspace.ID.String()),
			logger.String("schedule_id", schedule.ID.String()),
			logger.String("opens_at", schedule.OpensAt.String()),
			logger.String("error", err.Error()),
		)
		return
	}

	if !openTime.Before(reportTime) {
		r.logger.Warn(
			"scheduler skipped reminder rule because standup open time is not before close time",
			logger.String("workspace_id", workspace.ID.String()),
			logger.String("schedule_id", schedule.ID.String()),
			logger.String("opens_at", schedule.OpensAt.String()),
			logger.String("time_of_day", schedule.TimeOfDay.String()),
		)
		return
	}

	reminderWindowStart := openTime
	reminderWindowMinutes := int(reportTime.Sub(openTime).Minutes())

	for sequenceNumber, offsetMinutes := range offsets {
		if offsetMinutes < 0 || offsetMinutes >= reminderWindowMinutes {
			r.logger.Warn(
				"scheduler skipped reminder time outside the standup window",
				logger.String("workspace_id", workspace.ID.String()),
				logger.String("schedule_id", schedule.ID.String()),
				logger.String("sequence_number", fmt.Sprintf("%d", sequenceNumber)),
				logger.String("offset_minutes", fmt.Sprintf("%d", offsetMinutes)),
			)
			continue
		}

		dueAt := reminderWindowStart.Add(time.Duration(offsetMinutes) * time.Minute)
		if !sameLocalMinute(localNow, dueAt) {
			continue
		}

		result, err := r.reminderSequenceExecutor.ExecuteSequence(ctx, service.ExecuteReminderSequenceInput{
			WorkspaceID:    workspace.ID.String(),
			ScheduleID:     schedule.ID.String(),
			OccurrenceDate: occurrenceDate.String(),
			SequenceNumber: sequenceNumber,
		})
		if err != nil {
			r.logger.Warn(
				"scheduler failed to execute reminder sequence",
				logger.String("workspace_id", workspace.ID.String()),
				logger.String("schedule_id", schedule.ID.String()),
				logger.String("sequence_number", fmt.Sprintf("%d", sequenceNumber)),
				logger.String("error", err.Error()),
			)
			continue
		}

		r.logger.Debug(
			"scheduler executed reminder sequence",
			logger.String("workspace_id", workspace.ID.String()),
			logger.String("schedule_id", schedule.ID.String()),
			logger.String("sequence_number", fmt.Sprintf("%d", sequenceNumber)),
			logger.String("dm_sent", fmt.Sprintf("%d", result.DMRemindersSent)),
			logger.String("channel_sent", fmt.Sprintf("%d", result.ChannelRemindersSent)),
			logger.String("skipped_existing", fmt.Sprintf("%d", result.SkippedExistingRuns)),
		)
	}
}

/*
executeDueScheduleReport posts an automated report when the schedule's report time is due.
*/
func (r *Runner) executeDueScheduleReport(
	ctx context.Context,
	workspace domain.Workspace,
	schedule domain.StandupSchedule,
	occurrenceDate domain.LocalDate,
	localNow time.Time,
) {
	reportTime, err := scheduleTimeForDate(localNow, schedule.TimeOfDay)
	if err != nil {
		r.logger.Warn(
			"scheduler could not parse standup report time",
			logger.String("workspace_id", workspace.ID.String()),
			logger.String("schedule_id", schedule.ID.String()),
			logger.String("time_of_day", schedule.TimeOfDay.String()),
			logger.String("error", err.Error()),
		)
		return
	}

	if !sameLocalMinute(localNow, reportTime) {
		return
	}

	r.executeDueReports(ctx, workspace, schedule, occurrenceDate, localNow)
}

/*
executeDueReports posts due automated reports at the schedule report time.
*/
func (r *Runner) executeDueReports(
	ctx context.Context,
	workspace domain.Workspace,
	schedule domain.StandupSchedule,
	occurrenceDate domain.LocalDate,
	localNow time.Time,
) {
	switch schedule.Kind {
	case domain.StandupKindDaily:
		r.executeDueDailyReport(ctx, workspace, schedule, occurrenceDate)

	case domain.StandupKindWeekly:
		r.executeDueWeeklyReport(ctx, workspace, schedule, occurrenceDate, localNow)
	}
}

/*
executeDueDailyReport posts the automated daily report after the final reminder sequence.
*/
func (r *Runner) executeDueDailyReport(
	ctx context.Context,
	workspace domain.Workspace,
	schedule domain.StandupSchedule,
	occurrenceDate domain.LocalDate,
) {
	result, err := r.reportAutomationExecutor.PostDailyAutomated(ctx, service.PostDailyReportAutomationInput{
		WorkspaceID:    workspace.ID.String(),
		ScheduleID:     schedule.ID.String(),
		OccurrenceDate: occurrenceDate.String(),
	})
	if err != nil {
		r.logger.Warn(
			"scheduler failed to post automated daily report",
			logger.String("workspace_id", workspace.ID.String()),
			logger.String("schedule_id", schedule.ID.String()),
			logger.String("date", occurrenceDate.String()),
			logger.String("error", err.Error()),
		)
		return
	}

	if !result.Posted {
		r.logger.Debug(
			"scheduler skipped automated daily report",
			logger.String("workspace_id", workspace.ID.String()),
			logger.String("schedule_id", schedule.ID.String()),
			logger.String("date", occurrenceDate.String()),
			logger.String("reason", result.SkippedReason),
		)
		return
	}

	r.logger.Debug(
		"scheduler posted automated daily report",
		logger.String("workspace_id", workspace.ID.String()),
		logger.String("schedule_id", schedule.ID.String()),
		logger.String("date", occurrenceDate.String()),
	)
}

/*
executeDueWeeklyReport posts the automated weekly report on the last working day.

The MVP period is the seven calendar days ending on the weekly report date.
*/
func (r *Runner) executeDueWeeklyReport(
	ctx context.Context,
	workspace domain.Workspace,
	schedule domain.StandupSchedule,
	occurrenceDate domain.LocalDate,
	localNow time.Time,
) {
	if schedule.WeeklyMode != domain.WeeklyModeLastWorkingDay {
		r.logger.Debug(
			"scheduler skipped weekly report because weekly mode is not last working day",
			logger.String("workspace_id", workspace.ID.String()),
			logger.String("schedule_id", schedule.ID.String()),
			logger.String("date", occurrenceDate.String()),
		)
		return
	}

	periodStart, periodEnd := weeklyReportPeriodEnding(localNow)

	result, err := r.reportAutomationExecutor.PostWeeklyAutomated(ctx, service.PostWeeklyReportAutomationInput{
		WorkspaceID: workspace.ID.String(),
		ScheduleID:  schedule.ID.String(),
		PeriodStart: periodStart.String(),
		PeriodEnd:   periodEnd.String(),
	})
	if err != nil {
		r.logger.Warn(
			"scheduler failed to post automated weekly report",
			logger.String("workspace_id", workspace.ID.String()),
			logger.String("schedule_id", schedule.ID.String()),
			logger.String("period_start", periodStart.String()),
			logger.String("period_end", periodEnd.String()),
			logger.String("error", err.Error()),
		)
		return
	}

	if !result.Posted {
		r.logger.Debug(
			"scheduler skipped automated weekly report",
			logger.String("workspace_id", workspace.ID.String()),
			logger.String("schedule_id", schedule.ID.String()),
			logger.String("period_start", periodStart.String()),
			logger.String("period_end", periodEnd.String()),
			logger.String("reason", result.SkippedReason),
		)
		return
	}

	r.logger.Debug(
		"scheduler posted automated weekly report",
		logger.String("workspace_id", workspace.ID.String()),
		logger.String("schedule_id", schedule.ID.String()),
		logger.String("period_start", periodStart.String()),
		logger.String("period_end", periodEnd.String()),
	)
}

/*
weeklyReportPeriodEnding returns a seven-day period ending on localNow's date.
*/
func weeklyReportPeriodEnding(localNow time.Time) (domain.LocalDate, domain.LocalDate) {
	periodEnd := domain.LocalDate(localNow.Format("2006-01-02"))
	periodStartTime := localNow.AddDate(0, 0, -6)
	periodStart := domain.LocalDate(periodStartTime.Format("2006-01-02"))

	return periodStart, periodEnd
}

/*
loadWorkspaceLocation loads a workspace timezone with a UTC fallback for empty values.
*/
func loadWorkspaceLocation(timezone string) (*time.Location, error) {
	if timezone == "" {
		return time.UTC, nil
	}

	return time.LoadLocation(timezone)
}

/*
rulesByScheduleID groups reminder rules by their linked schedule.
*/
func rulesByScheduleID(rules []domain.ReminderRule) map[domain.ID][]domain.ReminderRule {
	indexed := make(map[domain.ID][]domain.ReminderRule, len(rules))

	for _, rule := range rules {
		indexed[rule.ScheduleID] = append(indexed[rule.ScheduleID], rule)
	}

	return indexed
}

/*
decodeReminderOffsets decodes reminder-rule offset JSON.
*/
func decodeReminderOffsets(value string) []int {
	offsets := []int{}

	if err := json.Unmarshal([]byte(value), &offsets); err != nil {
		return []int{}
	}

	return offsets
}

/*
scheduleTimeForDate returns the local datetime for a schedule on localNow's date.
*/
func scheduleTimeForDate(localNow time.Time, timeOfDay domain.TimeOfDay) (time.Time, error) {
	parsed, err := time.Parse("15:04", timeOfDay.String())
	if err != nil {
		return time.Time{}, err
	}

	return time.Date(
		localNow.Year(),
		localNow.Month(),
		localNow.Day(),
		parsed.Hour(),
		parsed.Minute(),
		0,
		0,
		localNow.Location(),
	), nil
}

/*
sameLocalMinute returns true when two local times fall in the same minute.
*/
func sameLocalMinute(first time.Time, second time.Time) bool {
	return first.Truncate(time.Minute).Equal(second.Truncate(time.Minute))
}

const schedulerActorUserID = "campfire-scheduler"
