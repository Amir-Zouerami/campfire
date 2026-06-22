package scheduler

import (
	"context"
	"testing"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/logger"
	"github.com/amir-zouerami/campfire/server/service"
)

func TestTickWorkspaceSkipsWeeklyOpeningAndReminderBeforeLastWorkingDay(t *testing.T) {
	t.Parallel()

	workspace, schedule, rule := schedulerTestFixtures()
	runtime := &stubRuntimeProvider{
		decision: &domain.StandupRunDecision{
			WorkspaceID:            workspace.ID,
			Date:                   domain.LocalDate("2026-06-17"),
			ShouldRun:              true,
			IsLastWorkingDayOfWeek: false,
		},
	}
	reminders := &recordingReminderExecutor{}
	reports := &recordingReportExecutor{}
	runner := newTestRunner(runtime, reminders, reports, []domain.StandupSchedule{schedule}, []domain.ReminderRule{rule})

	runner.tickWorkspace(context.Background(), workspace, time.Date(2026, 6, 17, 9, 0, 0, 0, time.UTC))

	if len(reminders.openings) != 0 {
		t.Fatalf("weekly opening count = %d, want 0", len(reminders.openings))
	}

	if len(reminders.sequences) != 0 {
		t.Fatalf("weekly reminder sequence count = %d, want 0", len(reminders.sequences))
	}

	if reports.weeklyCount != 0 {
		t.Fatalf("weekly report count = %d, want 0", reports.weeklyCount)
	}
}

func TestTickWorkspaceRunsWeeklyOpeningAndReminderOnLastWorkingDay(t *testing.T) {
	t.Parallel()

	workspace, schedule, rule := schedulerTestFixtures()
	runtime := &stubRuntimeProvider{
		decision: &domain.StandupRunDecision{
			WorkspaceID:            workspace.ID,
			Date:                   domain.LocalDate("2026-06-18"),
			ShouldRun:              true,
			IsLastWorkingDayOfWeek: true,
		},
	}
	reminders := &recordingReminderExecutor{}
	reports := &recordingReportExecutor{}
	runner := newTestRunner(runtime, reminders, reports, []domain.StandupSchedule{schedule}, []domain.ReminderRule{rule})

	runner.tickWorkspace(context.Background(), workspace, time.Date(2026, 6, 18, 9, 0, 0, 0, time.UTC))

	if len(reminders.openings) != 1 {
		t.Fatalf("weekly opening count = %d, want 1", len(reminders.openings))
	}

	if len(reminders.sequences) != 1 {
		t.Fatalf("weekly reminder sequence count = %d, want 1", len(reminders.sequences))
	}

	if reports.weeklyCount != 0 {
		t.Fatalf("weekly report count at open time = %d, want 0", reports.weeklyCount)
	}
}

func TestTickWorkspaceRunsWeeklyReportOnLastWorkingDayOnly(t *testing.T) {
	t.Parallel()

	workspace, schedule, rule := schedulerTestFixtures()
	tests := []struct {
		name                 string
		isLastWorkingDay     bool
		wantWeeklyReportRuns int
	}{
		{name: "not last working day", isLastWorkingDay: false, wantWeeklyReportRuns: 0},
		{name: "last working day", isLastWorkingDay: true, wantWeeklyReportRuns: 1},
	}

	for _, test := range tests {
		test := test
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()

			runtime := &stubRuntimeProvider{
				decision: &domain.StandupRunDecision{
					WorkspaceID:            workspace.ID,
					Date:                   domain.LocalDate("2026-06-18"),
					ShouldRun:              true,
					IsLastWorkingDayOfWeek: test.isLastWorkingDay,
				},
			}
			reminders := &recordingReminderExecutor{}
			reports := &recordingReportExecutor{}
			runner := newTestRunner(runtime, reminders, reports, []domain.StandupSchedule{schedule}, []domain.ReminderRule{rule})

			runner.tickWorkspace(context.Background(), workspace, time.Date(2026, 6, 18, 10, 0, 0, 0, time.UTC))

			if reports.weeklyCount != test.wantWeeklyReportRuns {
				t.Fatalf("weekly report count = %d, want %d", reports.weeklyCount, test.wantWeeklyReportRuns)
			}
		})
	}
}

func TestTickWorkspaceKeepsDailyScheduleRunningOnNormalWorkingDays(t *testing.T) {
	t.Parallel()

	workspace, schedule, rule := schedulerTestFixtures()
	schedule.Kind = domain.StandupKindDaily
	schedule.WeeklyMode = domain.WeeklyModeNone
	runtime := &stubRuntimeProvider{
		decision: &domain.StandupRunDecision{
			WorkspaceID:            workspace.ID,
			Date:                   domain.LocalDate("2026-06-17"),
			ShouldRun:              true,
			IsLastWorkingDayOfWeek: false,
		},
	}
	reminders := &recordingReminderExecutor{}
	reports := &recordingReportExecutor{}
	runner := newTestRunner(runtime, reminders, reports, []domain.StandupSchedule{schedule}, []domain.ReminderRule{rule})

	runner.tickWorkspace(context.Background(), workspace, time.Date(2026, 6, 17, 9, 0, 0, 0, time.UTC))

	if len(reminders.openings) != 1 {
		t.Fatalf("daily opening count = %d, want 1", len(reminders.openings))
	}

	if len(reminders.sequences) != 1 {
		t.Fatalf("daily reminder sequence count = %d, want 1", len(reminders.sequences))
	}
}

func schedulerTestFixtures() (domain.Workspace, domain.StandupSchedule, domain.ReminderRule) {
	workspace := domain.Workspace{
		ID:       domain.ID("workspace-1"),
		Timezone: "UTC",
	}
	schedule := domain.StandupSchedule{
		ID:          domain.ID("schedule-weekly"),
		WorkspaceID: workspace.ID,
		Kind:        domain.StandupKindWeekly,
		Enabled:     true,
		OpensAt:     domain.TimeOfDay("09:00"),
		TimeOfDay:   domain.TimeOfDay("10:00"),
		WeeklyMode:  domain.WeeklyModeLastWorkingDay,
	}
	rule := domain.ReminderRule{
		ID:                  domain.ID("rule-1"),
		WorkspaceID:         workspace.ID,
		ScheduleID:          schedule.ID,
		Enabled:             true,
		ReminderOffsetsJSON: "[0]",
	}

	return workspace, schedule, rule
}

func newTestRunner(
	runtime *stubRuntimeProvider,
	reminders *recordingReminderExecutor,
	reports *recordingReportExecutor,
	schedules []domain.StandupSchedule,
	rules []domain.ReminderRule,
) *Runner {
	return &Runner{
		logger:                   noopLogger{},
		standupScheduleProvider:  &stubScheduleProvider{schedules: schedules},
		reminderRuleProvider:     &stubReminderRuleProvider{rules: rules},
		standupRuntimeProvider:   runtime,
		reminderSequenceExecutor: reminders,
		reportAutomationExecutor: reports,
	}
}

type noopLogger struct{}

func (noopLogger) Debug(string, ...logger.Field) {}
func (noopLogger) Info(string, ...logger.Field)  {}
func (noopLogger) Warn(string, ...logger.Field)  {}
func (noopLogger) Error(string, ...logger.Field) {}

type stubScheduleProvider struct {
	schedules []domain.StandupSchedule
}

func (p *stubScheduleProvider) ListSchedulesByWorkspaceID(
	context.Context,
	domain.ID,
) ([]domain.StandupSchedule, error) {
	return p.schedules, nil
}

type stubReminderRuleProvider struct {
	rules []domain.ReminderRule
}

func (p *stubReminderRuleProvider) ListByWorkspaceID(context.Context, domain.ID) ([]domain.ReminderRule, error) {
	return p.rules, nil
}

type stubRuntimeProvider struct {
	decision *domain.StandupRunDecision
}

func (p *stubRuntimeProvider) EvaluateDay(
	context.Context,
	service.EvaluateStandupDayInput,
) (*domain.StandupRunDecision, error) {
	return p.decision, nil
}

type recordingReminderExecutor struct {
	openings  []service.ExecuteOpeningAnnouncementInput
	sequences []service.ExecuteReminderSequenceInput
}

func (e *recordingReminderExecutor) ExecuteOpeningAnnouncement(
	_ context.Context,
	input service.ExecuteOpeningAnnouncementInput,
) (*service.ExecuteOpeningAnnouncementResult, error) {
	e.openings = append(e.openings, input)

	return &service.ExecuteOpeningAnnouncementResult{Sent: true}, nil
}

func (e *recordingReminderExecutor) ExecuteSequence(
	_ context.Context,
	input service.ExecuteReminderSequenceInput,
) (*service.ExecuteReminderSequenceResult, error) {
	e.sequences = append(e.sequences, input)

	return &service.ExecuteReminderSequenceResult{}, nil
}

type recordingReportExecutor struct {
	dailyCount  int
	weeklyCount int
}

func (e *recordingReportExecutor) PostDailyAutomated(
	context.Context,
	service.PostDailyReportAutomationInput,
) (*service.PostDailyReportAutomationResult, error) {
	e.dailyCount++

	return &service.PostDailyReportAutomationResult{Posted: true}, nil
}

func (e *recordingReportExecutor) PostWeeklyAutomated(
	context.Context,
	service.PostWeeklyReportAutomationInput,
) (*service.PostWeeklyReportAutomationResult, error) {
	e.weeklyCount++

	return &service.PostWeeklyReportAutomationResult{Posted: true}, nil
}
