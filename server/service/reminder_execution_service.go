package service

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/store"
	"github.com/google/uuid"
)

/*
ExecuteReminderSequenceInput identifies one workspace/date reminder sequence.

SequenceNumber is the zero-based index into a reminder rule's offset list.
For example offsets [0, 30, 45, 55] have sequence numbers 0, 1, 2, and 3.
*/
type ExecuteReminderSequenceInput struct {
	WorkspaceID    string
	ScheduleID     string
	OccurrenceDate string
	SequenceNumber int
}

/*
ExecuteReminderSequenceResult summarizes reminder work completed by one execution.
*/
type ExecuteReminderSequenceResult struct {
	DMRemindersSent      int
	ChannelRemindersSent int
	SkippedExistingRuns  int
	SkippedRules         int
}

/*
ReminderExecutionService sends due standup reminders idempotently.
*/
type ReminderExecutionService struct {
	workspaceStore       store.WorkspaceStore
	reminderStore        store.ReminderStore
	notificationRunStore store.NotificationRunStore
	standupService       *StandupService
	reminderPublisher    StandupReminderPublisher
}

/*
NewReminderExecutionService creates a reminder execution service.
*/
func NewReminderExecutionService(
	workspaceStore store.WorkspaceStore,
	reminderStore store.ReminderStore,
	notificationRunStore store.NotificationRunStore,
	standupService *StandupService,
	reminderPublisher StandupReminderPublisher,
) *ReminderExecutionService {
	return &ReminderExecutionService{
		workspaceStore:       workspaceStore,
		reminderStore:        reminderStore,
		notificationRunStore: notificationRunStore,
		standupService:       standupService,
		reminderPublisher:    reminderPublisher,
	}
}

/*
ExecuteSequence sends configured reminders for one workspace/date/sequence.

This method is scheduler-safe and uses notification runs to avoid duplicate
sends when the same sequence is executed again.
*/
func (s *ReminderExecutionService) ExecuteSequence(
	ctx context.Context,
	input ExecuteReminderSequenceInput,
) (*ExecuteReminderSequenceResult, error) {
	cleanWorkspaceID := strings.TrimSpace(input.WorkspaceID)
	if cleanWorkspaceID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
	}

	if input.SequenceNumber < 0 {
		return nil, NewError(ErrorCodeValidationFailed, "Reminder sequence number cannot be negative.")
	}

	occurrenceDate := domain.LocalDate(strings.TrimSpace(input.OccurrenceDate))
	if _, err := parseLocalDate(occurrenceDate); err != nil {
		return nil, NewError(ErrorCodeValidationFailed, "Occurrence date must be a real YYYY-MM-DD calendar date.")
	}

	cleanScheduleID := strings.TrimSpace(input.ScheduleID)
	if cleanScheduleID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Schedule ID is required.")
	}

	workspaceID := domain.ID(cleanWorkspaceID)
	scheduleID := domain.ID(cleanScheduleID)

	workspace, err := s.workspaceStore.GetByID(ctx, workspaceID)

	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Workspace was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load workspace.")
	}

	rules, err := s.reminderStore.ListByWorkspaceID(ctx, workspaceID)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load reminder settings.")
	}

	summary, err := s.standupService.ListSubmissions(ctx, ListStandupSubmissionsInput{
		ActorUserID:    schedulerActorUserID,
		WorkspaceID:    workspaceID.String(),
		OccurrenceDate: occurrenceDate.String(),
		SortMode:       string(domain.StandupSubmissionSortName),
	})
	if err != nil {
		return nil, err
	}

	result := &ExecuteReminderSequenceResult{}

	for _, rule := range rules {
		if !rule.Enabled {
			result.SkippedRules++
			continue
		}

		if rule.ScheduleID != scheduleID {
			result.SkippedRules++
			continue
		}

		offsets := decodeReminderOffsetsForExecution(rule.ReminderOffsetsJSON)
		if input.SequenceNumber >= len(offsets) {
			result.SkippedRules++
			continue
		}

		if rule.DMReminderEnabled {
			sentCount, skippedCount, err := s.sendDMReminders(
				ctx,
				*workspace,
				rule,
				occurrenceDate,
				input.SequenceNumber,
				summary.MissingUserIDs,
			)
			if err != nil {
				return nil, err
			}

			result.DMRemindersSent += sentCount
			result.SkippedExistingRuns += skippedCount
		}

		if rule.ChannelReminderEnabled && len(summary.MissingUserIDs) > 0 {
			sent, skipped, err := s.sendChannelReminder(
				ctx,
				*workspace,
				rule,
				occurrenceDate,
				input.SequenceNumber,
				summary.MissingUserIDs,
			)
			if err != nil {
				return nil, err
			}

			if sent {
				result.ChannelRemindersSent++
			}

			if skipped {
				result.SkippedExistingRuns++
			}
		}
	}

	return result, nil
}

/*
sendDMReminders sends missing-user DM reminders for one reminder rule.
*/
func (s *ReminderExecutionService) sendDMReminders(
	ctx context.Context,
	workspace domain.Workspace,
	rule domain.ReminderRule,
	occurrenceDate domain.LocalDate,
	sequenceNumber int,
	missingUserIDs []string,
) (int, int, error) {
	sentCount := 0
	skippedCount := 0

	for _, userID := range missingUserIDs {
		cleanUserID := strings.TrimSpace(userID)
		if cleanUserID == "" {
			continue
		}

		key := notificationRunKey(
			rule,
			domain.NotificationKindDMReminder,
			occurrenceDate,
			sequenceNumber,
			cleanUserID,
		)

		exists, err := s.notificationRunExists(ctx, key)
		if err != nil {
			return sentCount, skippedCount, err
		}

		if exists {
			skippedCount++
			continue
		}

		postID, err := s.reminderPublisher.SendStandupDMReminder(ctx, StandupDMReminder{
			WorkspaceID:    workspace.ID.String(),
			WorkspaceName:  workspace.Name,
			ChannelID:      workspace.ChannelID,
			ScheduleID:     rule.ScheduleID.String(),
			OccurrenceDate: occurrenceDate.String(),
			TargetUserID:   cleanUserID,
			SequenceNumber: sequenceNumber,
		})
		if err != nil {
			return sentCount, skippedCount, NewError(ErrorCodeInternal, "Could not send standup DM reminder.")
		}

		if _, err := s.createNotificationRun(ctx, key, postID); err != nil {
			return sentCount, skippedCount, err
		}

		sentCount++
	}

	return sentCount, skippedCount, nil
}

/*
sendChannelReminder sends one channel missing-user reminder for a reminder rule.
*/
func (s *ReminderExecutionService) sendChannelReminder(
	ctx context.Context,
	workspace domain.Workspace,
	rule domain.ReminderRule,
	occurrenceDate domain.LocalDate,
	sequenceNumber int,
	missingUserIDs []string,
) (bool, bool, error) {
	key := notificationRunKey(
		rule,
		domain.NotificationKindChannelMissingReminder,
		occurrenceDate,
		sequenceNumber,
		"",
	)

	exists, err := s.notificationRunExists(ctx, key)
	if err != nil {
		return false, false, err
	}

	if exists {
		return false, true, nil
	}

	postID, err := s.reminderPublisher.SendChannelMissingReminder(ctx, StandupChannelMissingReminder{
		WorkspaceID:         workspace.ID.String(),
		WorkspaceName:       workspace.Name,
		ChannelID:           workspace.ChannelID,
		ScheduleID:          rule.ScheduleID.String(),
		OccurrenceDate:      occurrenceDate.String(),
		MissingUserIDs:      missingUserIDs,
		MissingUserCount:    len(missingUserIDs),
		MentionMissingUsers: rule.MentionMissingInChannel,
		SequenceNumber:      sequenceNumber,
	})
	if err != nil {
		return false, false, NewError(ErrorCodeInternal, "Could not send channel missing-user reminder.")
	}

	if _, err := s.createNotificationRun(ctx, key, postID); err != nil {
		return false, false, err
	}

	return true, false, nil
}

/*
notificationRunExists returns true when a notification run already exists.
*/
func (s *ReminderExecutionService) notificationRunExists(
	ctx context.Context,
	key store.NotificationRunDedupKey,
) (bool, error) {
	_, err := s.notificationRunStore.GetByDedupKey(ctx, key)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return false, nil
		}

		return false, NewError(ErrorCodeInternal, "Could not check notification history.")
	}

	return true, nil
}

/*
createNotificationRun records a sent reminder notification.
*/
func (s *ReminderExecutionService) createNotificationRun(
	ctx context.Context,
	key store.NotificationRunDedupKey,
	postID string,
) (*domain.NotificationRun, error) {
	now := time.Now().UTC()

	run := domain.NotificationRun{
		ID:               domain.ID(uuid.NewString()),
		WorkspaceID:      key.WorkspaceID,
		ReminderRuleID:   key.ReminderRuleID,
		ScheduleID:       key.ScheduleID,
		NotificationKind: key.NotificationKind,
		OccurrenceDate:   key.OccurrenceDate,
		SequenceNumber:   key.SequenceNumber,
		TargetUserID:     key.TargetUserID,
		MattermostPostID: strings.TrimSpace(postID),
		SentAt:           now,
		CreatedAt:        now,
	}

	created, err := s.notificationRunStore.Create(ctx, run)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not record notification history.")
	}

	return created, nil
}

/*
notificationRunKey builds a notification-run idempotency key.
*/
func notificationRunKey(
	rule domain.ReminderRule,
	kind domain.NotificationKind,
	occurrenceDate domain.LocalDate,
	sequenceNumber int,
	targetUserID string,
) store.NotificationRunDedupKey {
	return store.NotificationRunDedupKey{
		WorkspaceID:      rule.WorkspaceID,
		ReminderRuleID:   rule.ID,
		ScheduleID:       rule.ScheduleID,
		NotificationKind: kind,
		OccurrenceDate:   occurrenceDate,
		SequenceNumber:   sequenceNumber,
		TargetUserID:     strings.TrimSpace(targetUserID),
	}
}

/*
decodeReminderOffsetsForExecution decodes reminder offsets for scheduler execution.
*/
func decodeReminderOffsetsForExecution(value string) []int {
	offsets := []int{}

	if err := json.Unmarshal([]byte(value), &offsets); err != nil {
		return []int{}
	}

	return offsets
}

const schedulerActorUserID = "campfire-scheduler"
