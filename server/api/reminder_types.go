package api

import (
	"encoding/json"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/service"
)

/*
ReminderRulePayload is the API representation of a reminder rule.
*/
type ReminderRulePayload struct {
	ID                      string `json:"id"`
	WorkspaceID             string `json:"workspaceId"`
	ScheduleID              string `json:"scheduleId"`
	Enabled                 bool   `json:"enabled"`
	ChannelReminderEnabled  bool   `json:"channelReminderEnabled"`
	DMReminderEnabled       bool   `json:"dmReminderEnabled"`
	ReminderOffsets         []int  `json:"reminderOffsets"`
	MentionMissingInChannel bool   `json:"mentionMissingInChannel"`
	CreatedBy               string `json:"createdBy"`
	CreatedAt               string `json:"createdAt"`
	UpdatedAt               string `json:"updatedAt"`
}

/*
ListReminderRulesResponse is returned by GET /workspaces/{workspaceID}/reminders.
*/
type ListReminderRulesResponse struct {
	ReminderRules []ReminderRulePayload `json:"reminderRules"`
}

/*
UpdateReminderRuleRequest is accepted by PUT /workspaces/{workspaceID}/reminders/{reminderRuleID}.
*/
type UpdateReminderRuleRequest struct {
	Enabled                 bool  `json:"enabled"`
	ChannelReminderEnabled  bool  `json:"channelReminderEnabled"`
	DMReminderEnabled       bool  `json:"dmReminderEnabled"`
	ReminderOffsets         []int `json:"reminderOffsets"`
	MentionMissingInChannel bool  `json:"mentionMissingInChannel"`
}

/*
UpdateReminderRuleResponse is returned by PUT /workspaces/{workspaceID}/reminders/{reminderRuleID}.
*/
type UpdateReminderRuleResponse struct {
	ReminderRule ReminderRulePayload `json:"reminderRule"`
}

/*
ToServiceInput maps an API reminder update request to service input.
*/
func (r UpdateReminderRuleRequest) ToServiceInput(
	actorUserID string,
	isSystemAdmin bool,
	workspaceID string,
	reminderRuleID string,
) service.UpdateReminderRuleInput {
	return service.UpdateReminderRuleInput{
		ActorUserID:             actorUserID,
		IsSystemAdmin:           isSystemAdmin,
		WorkspaceID:             workspaceID,
		ReminderRuleID:          reminderRuleID,
		Enabled:                 r.Enabled,
		ChannelReminderEnabled:  r.ChannelReminderEnabled,
		DMReminderEnabled:       r.DMReminderEnabled,
		ReminderOffsets:         r.ReminderOffsets,
		MentionMissingInChannel: r.MentionMissingInChannel,
	}
}

/*
ReminderRulesToPayload maps reminder rules to API payloads.
*/
func ReminderRulesToPayload(rules []domain.ReminderRule) []ReminderRulePayload {
	payloads := make([]ReminderRulePayload, 0, len(rules))

	for _, rule := range rules {
		payloads = append(payloads, ReminderRuleToPayload(rule))
	}

	return payloads
}

/*
ReminderRuleToPayload maps one reminder rule to an API payload.
*/
func ReminderRuleToPayload(rule domain.ReminderRule) ReminderRulePayload {
	return ReminderRulePayload{
		ID:                      rule.ID.String(),
		WorkspaceID:             rule.WorkspaceID.String(),
		ScheduleID:              rule.ScheduleID.String(),
		Enabled:                 rule.Enabled,
		ChannelReminderEnabled:  rule.ChannelReminderEnabled,
		DMReminderEnabled:       rule.DMReminderEnabled,
		ReminderOffsets:         decodeReminderOffsets(rule.ReminderOffsetsJSON),
		MentionMissingInChannel: rule.MentionMissingInChannel,
		CreatedBy:               rule.CreatedBy,
		CreatedAt:               formatAPITime(rule.CreatedAt),
		UpdatedAt:               formatAPITime(rule.UpdatedAt),
	}
}

/*
decodeReminderOffsets decodes stored reminder offset JSON for API responses.
*/
func decodeReminderOffsets(value string) []int {
	offsets := []int{}

	if err := json.Unmarshal([]byte(value), &offsets); err != nil {
		return []int{}
	}

	return offsets
}
