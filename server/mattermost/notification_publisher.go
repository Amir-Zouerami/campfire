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
NotifyLeaveCancelled notifies approvers that a requester cancelled a pending leave request.
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

	return nil
}

/*
sendDirectMessage sends a bot-authored direct message to a Mattermost user.
*/
func (p *NotificationPublisher) sendDirectMessage(userID string, message string) error {
	cleanUserID := strings.TrimSpace(userID)
	if cleanUserID == "" {
		return nil
	}

	channel, appErr := p.api.GetDirectChannel(p.botUserID, cleanUserID)
	if appErr != nil {
		return appErr
	}

	_, appErr = p.api.CreatePost(&model.Post{
		UserId:    p.botUserID,
		ChannelId: channel.Id,
		Message:   message,
	})
	if appErr != nil {
		return appErr
	}

	return nil
}

/*
sendChannelMessage sends a bot-authored message to a Mattermost channel.
*/
func (p *NotificationPublisher) sendChannelMessage(channelID string, message string) error {
	cleanChannelID := strings.TrimSpace(channelID)
	if cleanChannelID == "" {
		return nil
	}

	cleanMessage := strings.TrimSpace(message)
	if cleanMessage == "" {
		return nil
	}

	_, appErr := p.api.CreatePost(&model.Post{
		UserId:    p.botUserID,
		ChannelId: cleanChannelID,
		Message:   cleanMessage,
	})
	if appErr != nil {
		return appErr
	}

	return nil
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

	lines := []string{
		"🔥 **Campfire leave cancelled**",
		"",
		fmt.Sprintf("%s cancelled their pending **%s** leave request.", requesterLabel, notification.LeaveTypeName),
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
