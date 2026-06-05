package service

import (
	"context"
	"encoding/json"
	"errors"
	"sort"
	"strings"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/store"
)

/*
ListReminderRulesInput contains filters for listing reminder rules.
*/
type ListReminderRulesInput struct {
	ActorUserID string
	WorkspaceID string
}

/*
UpdateReminderRuleInput contains mutable reminder-rule settings.
*/
type UpdateReminderRuleInput struct {
	ActorUserID             string
	IsSystemAdmin           bool
	WorkspaceID             string
	ReminderRuleID          string
	Enabled                 bool
	ChannelReminderEnabled  bool
	DMReminderEnabled       bool
	ReminderOffsets         []int
	MentionMissingInChannel bool
}

/*
ReminderService owns reminder-rule business rules.
*/
type ReminderService struct {
	workspaceStore     store.WorkspaceStore
	workspaceRoleStore store.WorkspaceRoleStore
	reminderStore      store.ReminderStore
	standupStore       store.StandupStore
}

/*
NewReminderService creates a reminder service.
*/
func NewReminderService(
	workspaceStore store.WorkspaceStore,
	workspaceRoleStore store.WorkspaceRoleStore,
	reminderStore store.ReminderStore,
	standupStore store.StandupStore,
) *ReminderService {
	return &ReminderService{
		workspaceStore:     workspaceStore,
		workspaceRoleStore: workspaceRoleStore,
		reminderStore:      reminderStore,
		standupStore:       standupStore,
	}
}

/*
List returns reminder rules for one workspace.
*/
func (s *ReminderService) List(
	ctx context.Context,
	input ListReminderRulesInput,
) ([]domain.ReminderRule, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to view reminder settings.")
	}

	workspaceID, err := s.requireWorkspace(ctx, input.WorkspaceID)
	if err != nil {
		return nil, err
	}

	rules, err := s.reminderStore.ListByWorkspaceID(ctx, workspaceID)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load reminder settings.")
	}

	return rules, nil
}

/*
Update validates and updates one reminder rule.
*/
func (s *ReminderService) Update(
	ctx context.Context,
	input UpdateReminderRuleInput,
) (*domain.ReminderRule, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to update reminder settings.")
	}

	workspaceID, err := s.requireWorkspace(ctx, input.WorkspaceID)
	if err != nil {
		return nil, err
	}

	if err := s.requireReminderManagement(ctx, cleanActorUserID, input.IsSystemAdmin, workspaceID); err != nil {
		return nil, err
	}

	reminderRuleID := domain.ID(strings.TrimSpace(input.ReminderRuleID))
	if reminderRuleID.String() == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Reminder rule ID is required.")
	}

	existingRules, err := s.reminderStore.ListByWorkspaceID(ctx, workspaceID)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load reminder settings.")
	}

	existingRule := findReminderRule(existingRules, reminderRuleID)
	if existingRule == nil {
		return nil, NewError(ErrorCodeNotFound, "Reminder rule was not found.")
	}

	schedule, err := s.standupStore.GetScheduleByID(ctx, workspaceID, existingRule.ScheduleID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "The schedule linked to this reminder rule was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load the linked standup schedule.")
	}

	offsets, err := normalizeReminderOffsets(input.ReminderOffsets, schedule.OpensAt, schedule.TimeOfDay)
	if err != nil {
		return nil, err
	}

	offsetsJSON, err := encodeReminderOffsets(offsets)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not encode reminder offsets.")
	}

	updatedRule := *existingRule
	updatedRule.Enabled = input.Enabled
	updatedRule.ChannelReminderEnabled = input.ChannelReminderEnabled
	updatedRule.DMReminderEnabled = input.DMReminderEnabled
	updatedRule.ReminderOffsetsJSON = offsetsJSON
	updatedRule.MentionMissingInChannel = input.MentionMissingInChannel
	updatedRule.UpdatedAt = time.Now().UTC()

	updated, err := s.reminderStore.Update(ctx, updatedRule)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Reminder rule was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not update reminder settings.")
	}

	return updated, nil
}

/*
requireWorkspace validates that a workspace exists and returns its ID.
*/
func (s *ReminderService) requireWorkspace(ctx context.Context, workspaceID string) (domain.ID, error) {
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
requireReminderManagement ensures the actor can change reminder settings.
*/
func (s *ReminderService) requireReminderManagement(
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
		[]domain.Role{domain.RoleLead},
	)
	if err != nil {
		return NewError(ErrorCodeInternal, "Could not verify reminder settings permission.")
	}

	if !hasRole {
		return NewError(ErrorCodePermissionDenied, "Only workspace Leads and System Admins can manage reminder settings.")
	}

	return nil
}

/*
normalizeReminderOffsets validates, de-duplicates, and sorts reminder offsets.
Offsets are minute marks inside the pre-close reminder window. The UI exposes these as up to three HH:mm reminder times before the standup closes.
*/
func normalizeReminderOffsets(offsets []int, opensAt domain.TimeOfDay, closesAt domain.TimeOfDay) ([]int, error) {
	if len(offsets) == 0 {
		return nil, NewError(ErrorCodeValidationFailed, "At least one reminder time is required.")
	}

	if len(offsets) > 3 {
		return nil, NewError(ErrorCodeValidationFailed, "At most three reminder times are supported.")
	}

	openMinutes, ok := localTimeMinutes(opensAt)
	if !ok {
		return nil, NewError(ErrorCodeValidationFailed, "Standup open time is invalid.")
	}

	closeMinutes, ok := localTimeMinutes(closesAt)
	if !ok {
		return nil, NewError(ErrorCodeValidationFailed, "Standup close time is invalid.")
	}

	windowMinutes := closeMinutes - openMinutes
	if windowMinutes <= 0 {
		return nil, NewError(ErrorCodeValidationFailed, "Standup open time must be before close time.")
	}

	seen := map[int]bool{}
	normalized := make([]int, 0, len(offsets))

	for _, offset := range offsets {
		if offset < 0 {
			return nil, NewError(ErrorCodeValidationFailed, "Reminder times cannot be before the standup opens.")
		}

		if offset >= windowMinutes {
			return nil, NewError(ErrorCodeValidationFailed, "Reminder times must be after the standup opens and before it closes.")
		}

		if seen[offset] {
			continue
		}

		seen[offset] = true
		normalized = append(normalized, offset)
	}

	sort.Ints(normalized)

	return normalized, nil
}

/*
localTimeMinutes parses an HH:mm value into minutes after local midnight.
*/
func localTimeMinutes(value domain.TimeOfDay) (int, bool) {
	parsed, err := time.Parse("15:04", value.String())
	if err != nil {
		return 0, false
	}

	return parsed.Hour()*60 + parsed.Minute(), true
}

/*
encodeReminderOffsets serializes reminder offset minutes to JSON.
*/
func encodeReminderOffsets(offsets []int) (string, error) {
	encoded, err := json.Marshal(offsets)
	if err != nil {
		return "", err
	}

	return string(encoded), nil
}

/*
findReminderRule returns a reminder rule by ID.
*/
func findReminderRule(rules []domain.ReminderRule, ruleID domain.ID) *domain.ReminderRule {
	for _, rule := range rules {
		if rule.ID == ruleID {
			found := rule
			return &found
		}
	}

	return nil
}
