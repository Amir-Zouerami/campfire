package mattermost

import (
	"context"
	"fmt"
	"strings"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/service"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)

/*
NotificationPublisher sends Campfire notifications through Mattermost.

It is an infrastructure adapter for service.NotificationPublisher.
*/
type NotificationPublisher struct {
	api       plugin.API
	botUserID string
}

/*
NewNotificationPublisher creates a Mattermost-backed notification publisher.
*/
func NewNotificationPublisher(api plugin.API, botUserID string) *NotificationPublisher {
	return &NotificationPublisher{
		api:       api,
		botUserID: botUserID,
	}
}

/*
NotifyLeaveRequested notifies leave approvers that a new leave request is pending.
*/
func (p *NotificationPublisher) NotifyLeaveRequested(
	_ context.Context,
	notification service.LeaveRequestNotification,
) error {
	if strings.TrimSpace(p.botUserID) == "" {
		return fmt.Errorf("Campfire bot user ID is empty")
	}

	for _, approverUserID := range notification.ApproverUserIDs {
		if err := p.sendDirectMessage(approverUserID, formatLeaveRequestedMessage(p.api, notification)); err != nil {
			return err
		}
	}

	return nil
}

/*
NotifyLeaveDecided notifies the requester that their leave request was approved or rejected.

Approved leave is also announced in the workspace channel so the team has a
shared availability signal.
*/
func (p *NotificationPublisher) NotifyLeaveDecided(
	_ context.Context,
	notification service.LeaveDecisionNotification,
) error {
	if strings.TrimSpace(p.botUserID) == "" {
		return fmt.Errorf("Campfire bot user ID is empty")
	}

	if err := p.sendDirectMessage(notification.RequesterUserID, formatLeaveDecidedMessage(p.api, notification)); err != nil {
		return err
	}

	if domain.LeaveStatus(notification.Decision) != domain.LeaveStatusApproved {
		return nil
	}

	return p.sendChannelMessage(notification.ChannelID, formatApprovedLeaveChannelMessage(p.api, notification))
}

/*
NotifyLeaveCancelled notifies approvers that a requester cancelled leave.

When the cancelled request was previously approved, Campfire also posts an
availability update to the workspace channel so the team knows the requester is
no longer marked away.
*/
func (p *NotificationPublisher) NotifyLeaveCancelled(
	_ context.Context,
	notification service.LeaveCancellationNotification,
) error {
	if strings.TrimSpace(p.botUserID) == "" {
		return fmt.Errorf("Campfire bot user ID is empty")
	}

	for _, approverUserID := range notification.ApproverUserIDs {
		if err := p.sendDirectMessage(approverUserID, formatLeaveCancelledMessage(p.api, notification)); err != nil {
			return err
		}
	}

	if !notification.WasApproved {
		return nil
	}

	return p.sendChannelMessage(
		notification.ChannelID,
		formatApprovedLeaveCancelledChannelMessage(p.api, notification),
	)
}

/*
SendStandupDMReminder sends a direct standup reminder to one user.
*/
func (p *NotificationPublisher) SendStandupDMReminder(
	ctx context.Context,
	reminder service.StandupDMReminder,
) (string, error) {
	select {
	case <-ctx.Done():
		return "", ctx.Err()
	default:
	}

	if strings.TrimSpace(p.botUserID) == "" {
		return "", fmt.Errorf("Campfire bot user ID is empty")
	}

	return p.sendDirectMessageWithPostID(
		reminder.TargetUserID,
		formatStandupDMReminderMessage(p.api, reminder),
	)
}

/*
SendChannelMissingReminder posts a channel reminder for missing standup users.
*/
func (p *NotificationPublisher) SendChannelMissingReminder(
	ctx context.Context,
	reminder service.StandupChannelMissingReminder,
) (string, error) {
	select {
	case <-ctx.Done():
		return "", ctx.Err()
	default:
	}

	if strings.TrimSpace(p.botUserID) == "" {
		return "", fmt.Errorf("Campfire bot user ID is empty")
	}

	return p.sendChannelMessageWithPostID(
		reminder.ChannelID,
		formatChannelMissingReminderMessage(p.api, reminder),
	)
}

func (p *NotificationPublisher) sendDirectMessage(userID string, message string) error {
	_, err := p.sendDirectMessageWithPostID(userID, message)

	return err
}

/*
sendDirectMessageWithPostID sends a bot-authored direct message and returns the post ID.
*/
func (p *NotificationPublisher) sendDirectMessageWithPostID(userID string, message string) (string, error) {
	cleanUserID := strings.TrimSpace(userID)
	if cleanUserID == "" {
		return "", nil
	}

	cleanMessage := strings.TrimSpace(message)
	if cleanMessage == "" {
		return "", nil
	}

	channel, appErr := p.api.GetDirectChannel(p.botUserID, cleanUserID)
	if appErr != nil {
		return "", appErr
	}

	post, appErr := p.api.CreatePost(&model.Post{
		UserId:    p.botUserID,
		ChannelId: channel.Id,
		Message:   cleanMessage,
	})
	if appErr != nil {
		return "", appErr
	}

	if post == nil {
		return "", fmt.Errorf("Mattermost returned an empty direct-message post")
	}

	return post.Id, nil
}

func (p *NotificationPublisher) sendChannelMessage(channelID string, message string) error {
	_, err := p.sendChannelMessageWithPostID(channelID, message)

	return err
}

/*
sendChannelMessageWithPostID sends a bot-authored channel message and returns the post ID.
*/
func (p *NotificationPublisher) sendChannelMessageWithPostID(channelID string, message string) (string, error) {
	cleanChannelID := strings.TrimSpace(channelID)
	if cleanChannelID == "" {
		return "", nil
	}

	cleanMessage := strings.TrimSpace(message)
	if cleanMessage == "" {
		return "", nil
	}

	post, appErr := p.api.CreatePost(&model.Post{
		UserId:    p.botUserID,
		ChannelId: cleanChannelID,
		Message:   cleanMessage,
	})
	if appErr != nil {
		return "", appErr
	}

	if post == nil {
		return "", fmt.Errorf("Mattermost returned an empty channel post")
	}

	return post.Id, nil
}

/*
formatStandupDMReminderMessage formats a direct standup reminder.
*/
func formatStandupDMReminderMessage(api plugin.API, reminder service.StandupDMReminder) string {
	targetLabel := userMentionOrID(api, reminder.TargetUserID)

	lines := []string{
		"🔥 **Campfire standup reminder**",
		"",
		fmt.Sprintf("%s, your standup for **%s** is still missing.", targetLabel, reminder.OccurrenceDate),
		"Open Campfire in this channel to submit your update.",
	}

	if reminder.SequenceNumber > 0 {
		lines = append(lines, "", fmt.Sprintf("_Reminder #%d_", reminder.SequenceNumber+1))
	}

	return strings.Join(lines, "\n")
}

/*
formatChannelMissingReminderMessage formats a channel reminder for missing standup users.
*/
func formatChannelMissingReminderMessage(api plugin.API, reminder service.StandupChannelMissingReminder) string {
	lines := []string{
		"🔥 **Campfire standup reminder**",
		"",
		fmt.Sprintf("Missing standups for **%s**:", reminder.OccurrenceDate),
	}

	if reminder.MissingUserCount == 0 {
		lines = append(lines, "- No missing users.")
		return strings.Join(lines, "\n")
	}

	if !reminder.MentionMissingUsers {
		lines = append(lines, fmt.Sprintf("- %d missing users.", reminder.MissingUserCount))
		return strings.Join(lines, "\n")
	}

	for _, userID := range reminder.MissingUserIDs {
		lines = append(lines, fmt.Sprintf("- %s", userMentionOrID(api, userID)))
	}

	if reminder.SequenceNumber > 0 {
		lines = append(lines, "", fmt.Sprintf("_Reminder #%d_", reminder.SequenceNumber+1))
	}

	return strings.Join(lines, "\n")
}

/*
formatLeaveRequestedMessage formats the leave request approval notification.
*/
func formatLeaveRequestedMessage(api plugin.API, notification service.LeaveRequestNotification) string {
	requesterLabel := userMentionOrID(api, notification.RequesterUserID)

	lines := []string{
		"🔥 **Campfire leave request**",
		"",
		fmt.Sprintf("%s requested **%s** leave.", requesterLabel, notification.LeaveTypeName),
		fmt.Sprintf("**Dates:** %s → %s", notification.StartDate, notification.EndDate),
		fmt.Sprintf("**Status:** %s", notification.Status),
	}

	details := formatLeaveRequestDetails(
		notification.DurationMode,
		notification.HalfDayPart,
		notification.StartTime,
		notification.EndTime,
	)
	if details != "" {
		lines = append(lines, details)
	}

	if strings.TrimSpace(notification.Reason) != "" {
		lines = append(lines, fmt.Sprintf("**Reason:** %s", notification.Reason))
	}

	if strings.TrimSpace(notification.BackupUserID) != "" {
		lines = append(lines, fmt.Sprintf("**Backup:** %s", userMentionOrID(api, notification.BackupUserID)))
	}

	lines = append(lines, "", "Open Campfire to approve or reject this request.")

	return strings.Join(lines, "\n")
}

/*
formatLeaveDecidedMessage formats the leave approval/rejection notification.
*/
func formatLeaveDecidedMessage(api plugin.API, notification service.LeaveDecisionNotification) string {
	deciderLabel := userMentionOrID(api, notification.DeciderUserID)

	lines := []string{
		"🔥 **Campfire leave update**",
		"",
		fmt.Sprintf("Your **%s** leave request was **%s** by %s.", notification.LeaveTypeName, notification.Decision, deciderLabel),
		fmt.Sprintf("**Dates:** %s → %s", notification.StartDate, notification.EndDate),
	}

	details := formatLeaveRequestDetails(
		notification.DurationMode,
		notification.HalfDayPart,
		notification.StartTime,
		notification.EndTime,
	)
	if details != "" {
		lines = append(lines, details)
	}

	if strings.TrimSpace(notification.Comment) != "" {
		lines = append(lines, fmt.Sprintf("**Comment:** %s", notification.Comment))
	}

	return strings.Join(lines, "\n")
}

/*
formatLeaveCancelledMessage formats the leave cancellation notification.
*/
func formatLeaveCancelledMessage(api plugin.API, notification service.LeaveCancellationNotification) string {
	requesterLabel := userMentionOrID(api, notification.RequesterUserID)
	previousStatus := "pending"
	if notification.WasApproved {
		previousStatus = "approved"
	}

	lines := []string{
		"🔥 **Campfire leave cancelled**",
		"",
		fmt.Sprintf(
			"%s cancelled their %s **%s** leave request.",
			requesterLabel,
			previousStatus,
			notification.LeaveTypeName,
		),
		fmt.Sprintf("**Dates:** %s → %s", notification.StartDate, notification.EndDate),
		fmt.Sprintf("**Status:** %s", notification.Status),
	}

	details := formatLeaveRequestDetails(
		notification.DurationMode,
		notification.HalfDayPart,
		notification.StartTime,
		notification.EndTime,
	)
	if details != "" {
		lines = append(lines, details)
	}

	return strings.Join(lines, "\n")
}

/*
formatApprovedLeaveCancelledChannelMessage formats the team-facing announcement
for a cancelled approved leave request.
*/
func formatApprovedLeaveCancelledChannelMessage(
	api plugin.API,
	notification service.LeaveCancellationNotification,
) string {
	requesterLabel := userMentionOrID(api, notification.RequesterUserID)

	lines := []string{
		"🔥 **Campfire availability update**",
		"",
		fmt.Sprintf(
			"%s cancelled their approved **%s** leave.",
			requesterLabel,
			notification.LeaveTypeName,
		),
		fmt.Sprintf("**Dates:** %s → %s", notification.StartDate, notification.EndDate),
		"They are no longer marked as away for this period.",
	}

	details := formatLeaveRequestDetails(
		notification.DurationMode,
		notification.HalfDayPart,
		notification.StartTime,
		notification.EndTime,
	)
	if details != "" {
		lines = append(lines, details)
	}

	return strings.Join(lines, "\n")
}

/*
formatApprovedLeaveChannelMessage formats the team-facing approved leave announcement.
*/
func formatApprovedLeaveChannelMessage(api plugin.API, notification service.LeaveDecisionNotification) string {
	requesterLabel := userMentionOrID(api, notification.RequesterUserID)
	deciderLabel := userMentionOrID(api, notification.DeciderUserID)

	lines := []string{
		"🔥 **Campfire availability update**",
		"",
		fmt.Sprintf("%s will be away on approved **%s** leave.", requesterLabel, notification.LeaveTypeName),
		fmt.Sprintf("**Dates:** %s → %s", notification.StartDate, notification.EndDate),
		fmt.Sprintf("**Approved by:** %s", deciderLabel),
	}

	details := formatLeaveRequestDetails(
		notification.DurationMode,
		notification.HalfDayPart,
		notification.StartTime,
		notification.EndTime,
	)
	if details != "" {
		lines = append(lines, details)
	}

	if strings.TrimSpace(notification.Comment) != "" {
		lines = append(lines, fmt.Sprintf("**Approval note:** %s", notification.Comment))
	}

	return strings.Join(lines, "\n")
}

/*
formatLeaveRequestDetails returns mode-specific leave detail copy.
*/
func formatLeaveRequestDetails(durationMode string, halfDayPart string, startTime string, endTime string) string {
	switch durationMode {
	case string(domain.LeaveDurationHalfDay):
		if strings.TrimSpace(halfDayPart) == "" {
			return "**Duration:** half day"
		}

		return fmt.Sprintf("**Duration:** half day, %s", halfDayPart)

	case string(domain.LeaveDurationHourly):
		if strings.TrimSpace(startTime) == "" || strings.TrimSpace(endTime) == "" {
			return "**Duration:** hourly"
		}

		return fmt.Sprintf("**Duration:** %s → %s", startTime, endTime)

	default:
		return ""
	}
}

/*
userMentionOrID returns a Mattermost mention when the user can be loaded.
*/
func userMentionOrID(api plugin.API, userID string) string {
	userLabel := userID

	user, appErr := api.GetUser(userID)
	if appErr == nil && user != nil && user.Username != "" {
		userLabel = "@" + user.Username
	}

	return userLabel
}
