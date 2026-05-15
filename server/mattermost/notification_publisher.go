package mattermost

import (
	"context"
	"fmt"
	"strings"

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
formatLeaveRequestedMessage formats the leave request approval notification.
*/
func formatLeaveRequestedMessage(api plugin.API, notification service.LeaveRequestNotification) string {
	requesterLabel := notification.RequesterUserID

	requester, appErr := api.GetUser(notification.RequesterUserID)
	if appErr == nil && requester != nil && requester.Username != "" {
		requesterLabel = "@" + requester.Username
	}

	lines := []string{
		"🔥 **Campfire leave request**",
		"",
		fmt.Sprintf("%s requested **%s** leave.", requesterLabel, notification.LeaveTypeName),
		fmt.Sprintf("**Dates:** %s → %s", notification.StartDate, notification.EndDate),
		fmt.Sprintf("**Status:** %s", notification.Status),
	}

	details := formatLeaveDetails(notification)
	if details != "" {
		lines = append(lines, details)
	}

	if strings.TrimSpace(notification.Reason) != "" {
		lines = append(lines, fmt.Sprintf("**Reason:** %s", notification.Reason))
	}

	if strings.TrimSpace(notification.BackupUserID) != "" {
		lines = append(lines, fmt.Sprintf("**Backup:** %s", notification.BackupUserID))
	}

	lines = append(lines, "", "Open Campfire to approve or reject this request.")

	return strings.Join(lines, "\n")
}

/*
formatLeaveDetails returns mode-specific leave detail copy.
*/
func formatLeaveDetails(notification service.LeaveRequestNotification) string {
	switch notification.DurationMode {
	case "half_day":
		if strings.TrimSpace(notification.HalfDayPart) == "" {
			return "**Duration:** half day"
		}

		return fmt.Sprintf("**Duration:** half day, %s", notification.HalfDayPart)

	case "hourly":
		if strings.TrimSpace(notification.StartTime) == "" || strings.TrimSpace(notification.EndTime) == "" {
			return "**Duration:** hourly"
		}

		return fmt.Sprintf("**Duration:** %s → %s", notification.StartTime, notification.EndTime)

	default:
		return ""
	}
}
