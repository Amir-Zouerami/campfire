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
ReminderSequenceExecutor defines reminder execution behavior used by the scheduler.
*/
type ReminderSequenceExecutor interface {
	ExecuteSequence(
		ctx context.Context,
		input service.ExecuteReminderSequenceInput,
	) (*service.ExecuteReminderSequenceResult, error)
}

/*
Config contains dependencies and timing options for the scheduler runner.
*/
type Config struct {
	Logger                   logger.Logger
	WorkspaceProvider        WorkspaceProvider
	StandupScheduleProvider  StandupScheduleProvider
	ReminderRuleProvider     ReminderRuleProvider
	ReminderSequenceExecutor ReminderSequenceExecutor
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
	reminderSequenceExecutor ReminderSequenceExecutor
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
		reminderSequenceExecutor: config.ReminderSequenceExecutor,
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
		r.reminderSequenceExecutor != nil
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

	schedulesByID := schedulesByID(schedules)

	for _, rule := range rules {
		if !rule.Enabled {
			continue
		}

		schedule, exists := schedulesByID[rule.ScheduleID]
		if !exists || !schedule.Enabled {
			continue
		}

		r.executeDueReminderSequences(ctx, workspace, schedule, rule, occurrenceDate, localNow)
	}
}

/*
executeDueReminderSequences executes reminder sequences due in the current local minute.
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

	scheduleTime, err := scheduleTimeForDate(localNow, schedule.TimeOfDay)
	if err != nil {
		r.logger.Warn(
			"scheduler could not parse standup schedule time",
			logger.String("workspace_id", workspace.ID.String()),
			logger.String("schedule_id", schedule.ID.String()),
			logger.String("time_of_day", schedule.TimeOfDay.String()),
			logger.String("error", err.Error()),
		)
		return
	}

	for sequenceNumber, offsetMinutes := range offsets {
		dueAt := scheduleTime.Add(time.Duration(offsetMinutes) * time.Minute)
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
loadWorkspaceLocation loads a workspace timezone with a UTC fallback for empty values.
*/
func loadWorkspaceLocation(timezone string) (*time.Location, error) {
	if timezone == "" {
		return time.UTC, nil
	}

	return time.LoadLocation(timezone)
}

/*
schedulesByID indexes schedules by ID.
*/
func schedulesByID(schedules []domain.StandupSchedule) map[domain.ID]domain.StandupSchedule {
	indexed := make(map[domain.ID]domain.StandupSchedule, len(schedules))

	for _, schedule := range schedules {
		indexed[schedule.ID] = schedule
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
