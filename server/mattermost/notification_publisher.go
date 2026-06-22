package mattermost

import (
	"context"
	"fmt"
	"strings"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/i18n"
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

	for _, recipientUserID := range notification.RecipientUserIDs {
		if err := p.sendDirectMessage(recipientUserID, formatLeaveRequestedMessage(p.api, notification)); err != nil {
			return err
		}
	}

	return p.sendDirectMessage(notification.RequesterUserID, formatLeaveRequestSubmittedMessage(p.api, notification))
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

	return p.sendChannelMessage(
		notificationTargetChannelID(notification.AnnouncementChannelID, notification.ChannelID),
		formatApprovedLeaveChannelMessage(p.api, notification),
	)
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

	for _, approverUserID := range notification.RecipientUserIDs {
		if err := p.sendDirectMessage(approverUserID, formatLeaveCancelledMessage(p.api, notification)); err != nil {
			return err
		}
	}

	if !notification.WasApproved {
		return nil
	}

	return p.sendChannelMessage(
		notificationTargetChannelID(notification.AnnouncementChannelID, notification.ChannelID),
		formatApprovedLeaveCancelledChannelMessage(p.api, notification),
	)
}

/*
NotifyLeaveChangeRequested notifies approvers that a member requested a leave correction.
*/
func (p *NotificationPublisher) NotifyLeaveChangeRequested(
	_ context.Context,
	notification service.LeaveChangeRequestNotification,
) error {
	if strings.TrimSpace(p.botUserID) == "" {
		return fmt.Errorf("Campfire bot user ID is empty")
	}

	for _, recipientUserID := range notification.RecipientUserIDs {
		if err := p.sendDirectMessage(recipientUserID, formatLeaveChangeRequestedMessage(p.api, notification)); err != nil {
			return err
		}
	}

	return p.sendDirectMessage(notification.RequesterUserID, formatLeaveChangeSubmittedMessage(p.api, notification))
}

/*
NotifyLeaveChangeDecided notifies the requester after an approver accepts or rejects a requested leave correction.
*/
func (p *NotificationPublisher) NotifyLeaveChangeDecided(
	_ context.Context,
	notification service.LeaveChangeDecisionNotification,
) error {
	if strings.TrimSpace(p.botUserID) == "" {
		return fmt.Errorf("Campfire bot user ID is empty")
	}

	return p.sendDirectMessage(notification.RequesterUserID, formatLeaveChangeDecidedMessage(p.api, notification))
}

/*
NotifyLeaveUpdated notifies the requester after an approver directly edits a leave request.
*/
func (p *NotificationPublisher) NotifyLeaveUpdated(
	_ context.Context,
	notification service.LeaveUpdatedNotification,
) error {
	if strings.TrimSpace(p.botUserID) == "" {
		return fmt.Errorf("Campfire bot user ID is empty")
	}

	return p.sendDirectMessage(notification.RequesterUserID, formatLeaveUpdatedMessage(p.api, notification))
}

/*
SendStandupOpeningAnnouncement posts the channel-only standup opening message.
*/
func (p *NotificationPublisher) SendStandupOpeningAnnouncement(
	ctx context.Context,
	announcement service.StandupOpeningAnnouncement,
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
		announcement.ChannelID,
		formatStandupOpeningAnnouncementMessage(p.api, announcement),
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

/*
sendDirectMessage sends a bot-authored direct message.
*/
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

/*
sendChannelMessage sends a bot-authored channel message.
*/
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
notificationTargetChannelID returns the configured announcement channel when set.

When the override is empty, Campfire falls back to the workspace channel.
*/
func notificationTargetChannelID(overrideChannelID string, workspaceChannelID string) string {
	cleanOverride := strings.TrimSpace(overrideChannelID)
	if cleanOverride != "" {
		return cleanOverride
	}

	return strings.TrimSpace(workspaceChannelID)
}

/*
formatStandupOpeningAnnouncementMessage formats the channel-only opening message.
*/
func formatStandupOpeningAnnouncementMessage(
	api plugin.API,
	announcement service.StandupOpeningAnnouncement,
) string {
	copy := i18n.StandupCopy(announcement.Language)
	channelReference := channelReferenceOrWorkspaceName(api, announcement.ChannelID, announcement.WorkspaceName, copy.WorkspaceFallback)
	dateLabel := i18n.BidiIsolate(announcement.Language, announcement.OccurrenceDate)
	scheduleLabel := standupKindLabel(announcement.ScheduleKind, announcement.Language)

	lines := []string{
		formatNotificationHeading(copy.OpeningTitle),
		"",
		fmt.Sprintf(copy.OpeningSummary, scheduleLabel, channelReference),
		fmt.Sprintf("**%s:** %s", copy.DateLabel, dateLabel),
		copy.OpeningInstruction,
	}

	return strings.Join(lines, "\n")
}

/*
formatStandupDMReminderMessage formats a direct standup reminder.

DM reminders stay enabled, but the copy must not say "this channel" because the
DM itself is not the workspace channel. The message points the user to the real
workspace channel so Campfire opens in the correct context.
*/
func formatStandupDMReminderMessage(api plugin.API, reminder service.StandupDMReminder) string {
	copy := i18n.StandupCopy(reminder.Language)
	targetLabel := userMentionOrID(api, reminder.TargetUserID)
	channelReference := channelReferenceOrWorkspaceName(api, reminder.ChannelID, reminder.WorkspaceName, copy.WorkspaceFallback)
	dateLabel := i18n.BidiIsolate(reminder.Language, reminder.OccurrenceDate)

	lines := []string{
		formatNotificationHeading(copy.DMTitle),
		"",
		fmt.Sprintf(copy.DMSummary, targetLabel, dateLabel),
		fmt.Sprintf(copy.DMInstruction, channelReference),
		"",
		copy.DMOnlyMissingNotice,
	}

	if reminder.SequenceNumber > 0 {
		lines = append(lines, "", fmt.Sprintf(copy.ReminderNumber, reminder.SequenceNumber+1))
	}

	return strings.Join(lines, "\n")
}

/*
formatChannelMissingReminderMessage formats a channel reminder for missing standup users.
*/
func formatChannelMissingReminderMessage(api plugin.API, reminder service.StandupChannelMissingReminder) string {
	copy := i18n.StandupCopy(reminder.Language)
	dateLabel := i18n.BidiIsolate(reminder.Language, reminder.OccurrenceDate)
	lines := []string{
		formatNotificationHeading(copy.ChannelTitle),
		"",
		fmt.Sprintf(copy.ChannelSummary, dateLabel),
	}

	if reminder.MissingUserCount == 0 {
		lines = append(lines, copy.NoMissingUsers)
		return strings.Join(lines, "\n")
	}

	if !reminder.MentionMissingUsers {
		lines = append(lines, fmt.Sprintf(copy.MissingCount, reminder.MissingUserCount))
		return strings.Join(lines, "\n")
	}

	if reminder.MentionLimit > 0 && reminder.MissingUserCount > len(reminder.MissingUserIDs) {
		lines = append(
			lines,
			fmt.Sprintf(
				copy.TruncatedNotice,
				len(reminder.MissingUserIDs),
				reminder.MissingUserCount,
			),
			"",
		)
	}

	for _, userID := range reminder.MissingUserIDs {
		lines = append(lines, fmt.Sprintf("- %s", userMentionOrID(api, userID)))
	}

	if reminder.SequenceNumber > 0 {
		lines = append(lines, "", fmt.Sprintf(copy.ReminderNumber, reminder.SequenceNumber+1))
	}

	return strings.Join(lines, "\n")
}

/*
formatLeaveRequestedMessage formats the approver-facing leave request DM.
*/
func formatLeaveRequestedMessage(api plugin.API, notification service.LeaveRequestNotification) string {
	copy := leaveNotificationCopyForLanguage(notification.Language)
	requesterLabel := userMentionOrID(api, notification.RequesterUserID)
	workspaceLabel := channelReferenceOrWorkspaceName(api, notification.ChannelID, notification.WorkspaceName, "the workspace channel")

	lines := []string{
		formatNotificationHeading(copy.RequestTitle),
		"",
		fmt.Sprintf(copy.RequestSummary, requesterLabel, notification.LeaveTypeName),
		formatLabeledInlineValue(copy.WorkspaceLabel, workspaceLabel),
		formatLabeledInlineValue(copy.DatesLabel, formatDateRange(notification.StartDate, notification.EndDate)),
		formatLabeledInlineValue(copy.StatusLabel, translateLeaveStatus(notification.Status, copy)),
	}

	lines = appendLeaveRequestDetails(lines, copy, notification.DurationMode, notification.HalfDayPart, notification.StartTime, notification.EndTime)
	lines = appendLabeledMultilineValue(lines, copy.ReasonLabel, notification.Reason)

	if strings.TrimSpace(notification.BackupUserID) != "" {
		lines = append(lines, formatLabeledInlineValue(copy.BackupLabel, userMentionOrID(api, notification.BackupUserID)))
	}

	lines = append(lines, formatLabeledInlineValue(copy.CanContactLabel, translateBoolean(notification.CanContactIfNeeded, copy)))
	lines = append(lines, "", copy.OpenCampfireInstruction)

	return strings.Join(lines, "\n")
}

/*
formatLeaveRequestSubmittedMessage formats the requester-facing confirmation DM.
*/
func formatLeaveRequestSubmittedMessage(api plugin.API, notification service.LeaveRequestNotification) string {
	copy := leaveNotificationCopyForLanguage(notification.Language)
	recipientLabels := formatUserMentionList(api, notification.RecipientUserIDs, copy.NoRecipientFallback)

	lines := []string{
		formatNotificationHeading(copy.RequestSubmittedTitle),
		"",
		fmt.Sprintf(copy.RequestSubmittedSummary, notification.LeaveTypeName),
		formatLabeledInlineValue(copy.DatesLabel, formatDateRange(notification.StartDate, notification.EndDate)),
		formatLabeledInlineValue(copy.NotifiedRecipientsLabel, recipientLabels),
	}

	lines = appendLeaveRequestDetails(lines, copy, notification.DurationMode, notification.HalfDayPart, notification.StartTime, notification.EndTime)
	lines = append(lines, formatLabeledInlineValue(copy.CanContactLabel, translateBoolean(notification.CanContactIfNeeded, copy)))

	return strings.Join(lines, "\n")
}

/*
formatLeaveChangeRequestedMessage formats the approver-facing leave edit request DM.
*/
func formatLeaveChangeRequestedMessage(api plugin.API, notification service.LeaveChangeRequestNotification) string {
	copy := leaveNotificationCopyForLanguage(notification.Language)
	requesterLabel := userMentionOrID(api, notification.RequesterUserID)
	workspaceLabel := channelReferenceOrWorkspaceName(api, notification.ChannelID, notification.WorkspaceName, "the workspace channel")

	lines := []string{
		formatNotificationHeading(copy.ChangeRequestTitle),
		"",
		fmt.Sprintf(copy.ChangeRequestSummary, requesterLabel, notification.LeaveTypeName),
		formatLabeledInlineValue(copy.WorkspaceLabel, workspaceLabel),
		formatLabeledInlineValue(copy.DatesLabel, formatDateRange(notification.StartDate, notification.EndDate)),
	}

	lines = appendLeaveRequestDetails(lines, copy, notification.DurationMode, notification.HalfDayPart, notification.StartTime, notification.EndTime)
	lines = appendLabeledMultilineValue(lines, copy.ReasonLabel, notification.Reason)

	if strings.TrimSpace(notification.BackupUserID) != "" {
		lines = append(lines, formatLabeledInlineValue(copy.BackupLabel, userMentionOrID(api, notification.BackupUserID)))
	}

	lines = append(lines, formatLabeledInlineValue(copy.CanContactLabel, translateBoolean(notification.CanContactIfNeeded, copy)))
	lines = append(lines, "", copy.OpenCampfireInstruction)

	return strings.Join(lines, "\n")
}

/*
formatLeaveChangeSubmittedMessage formats the requester-facing confirmation for an edit request.
*/
func formatLeaveChangeSubmittedMessage(api plugin.API, notification service.LeaveChangeRequestNotification) string {
	copy := leaveNotificationCopyForLanguage(notification.Language)
	recipientLabels := formatUserMentionList(api, notification.RecipientUserIDs, copy.NoRecipientFallback)

	lines := []string{
		formatNotificationHeading(copy.ChangeSubmittedTitle),
		"",
		fmt.Sprintf(copy.ChangeSubmittedSummary, notification.LeaveTypeName),
		formatLabeledInlineValue(copy.DatesLabel, formatDateRange(notification.StartDate, notification.EndDate)),
		formatLabeledInlineValue(copy.NotifiedRecipientsLabel, recipientLabels),
	}

	lines = appendLeaveRequestDetails(lines, copy, notification.DurationMode, notification.HalfDayPart, notification.StartTime, notification.EndTime)

	return strings.Join(lines, "\n")
}

/*
formatLeaveChangeDecidedMessage formats the requester-facing decision for an edit request.
*/
func formatLeaveChangeDecidedMessage(api plugin.API, notification service.LeaveChangeDecisionNotification) string {
	copy := leaveNotificationCopyForLanguage(notification.Language)
	deciderLabel := userMentionOrID(api, notification.DeciderUserID)
	decisionLabel := translateLeaveChangeDecision(notification.Decision, copy)

	header := copy.ChangeDecisionTitle
	summary := fmt.Sprintf(copy.ChangeDecisionSummary, notification.LeaveTypeName, decisionLabel, deciderLabel)
	if domain.LeaveChangeRequestStatus(notification.Decision) == domain.LeaveChangeRequestStatusApproved {
		header = copy.ChangeApprovedTitle
		summary = fmt.Sprintf(copy.ChangeApprovedSummary, notification.LeaveTypeName, deciderLabel)
	}
	if domain.LeaveChangeRequestStatus(notification.Decision) == domain.LeaveChangeRequestStatusRejected {
		header = copy.ChangeRejectedTitle
		summary = fmt.Sprintf(copy.ChangeRejectedSummary, notification.LeaveTypeName, deciderLabel)
	}

	lines := []string{
		formatNotificationHeading(header),
		"",
		summary,
		formatLabeledInlineValue(copy.DatesLabel, formatDateRange(notification.StartDate, notification.EndDate)),
	}

	lines = appendLeaveRequestDetails(lines, copy, notification.DurationMode, notification.HalfDayPart, notification.StartTime, notification.EndTime)
	lines = append(lines, formatLabeledInlineValue(copy.CanContactLabel, translateBoolean(notification.CanContactIfNeeded, copy)))
	lines = appendLabeledMultilineValue(lines, copy.CommentLabel, notification.Comment)

	return strings.Join(lines, "\n")
}

/*
formatLeaveUpdatedMessage formats the requester-facing notification for direct approver edits.
*/
func formatLeaveUpdatedMessage(api plugin.API, notification service.LeaveUpdatedNotification) string {
	copy := leaveNotificationCopyForLanguage(notification.Language)
	editorLabel := userMentionOrID(api, notification.EditorUserID)

	lines := []string{
		formatNotificationHeading(copy.UpdatedTitle),
		"",
		fmt.Sprintf(copy.UpdatedSummary, notification.LeaveTypeName, editorLabel),
		formatLabeledInlineValue(copy.DatesLabel, formatDateRange(notification.StartDate, notification.EndDate)),
	}

	lines = appendLeaveRequestDetails(lines, copy, notification.DurationMode, notification.HalfDayPart, notification.StartTime, notification.EndTime)
	lines = append(lines, formatLabeledInlineValue(copy.CanContactLabel, translateBoolean(notification.CanContactIfNeeded, copy)))

	return strings.Join(lines, "\n")
}

/*
formatLeaveDecidedMessage formats the private leave approval/rejection notification.
*/
func formatLeaveDecidedMessage(api plugin.API, notification service.LeaveDecisionNotification) string {
	copy := leaveNotificationCopyForLanguage(notification.Language)
	deciderLabel := userMentionOrID(api, notification.DeciderUserID)

	header := copy.DecisionTitle
	summary := fmt.Sprintf(copy.DecisionSummary, notification.LeaveTypeName, translateLeaveStatus(notification.Decision, copy), deciderLabel)

	switch domain.LeaveStatus(notification.Decision) {
	case domain.LeaveStatusApproved:
		header = copy.ApprovedTitle
		summary = fmt.Sprintf(copy.ApprovedSummary, notification.LeaveTypeName, deciderLabel)

	case domain.LeaveStatusRejected:
		header = copy.RejectedTitle
		summary = fmt.Sprintf(copy.RejectedSummary, notification.LeaveTypeName, deciderLabel)
	}

	lines := []string{
		formatNotificationHeading(header),
		"",
		summary,
		formatLabeledInlineValue(copy.DatesLabel, formatDateRange(notification.StartDate, notification.EndDate)),
	}

	lines = appendLeaveRequestDetails(lines, copy, notification.DurationMode, notification.HalfDayPart, notification.StartTime, notification.EndTime)
	lines = append(lines, formatLabeledInlineValue(copy.CanContactLabel, translateBoolean(notification.CanContactIfNeeded, copy)))
	lines = appendLabeledMultilineValue(lines, copy.CommentLabel, notification.Comment)

	return strings.Join(lines, "\n")
}

/*
formatApprovedLeaveChannelMessage formats the team-facing approved leave post.

Approver comments are intentionally omitted because approval notes are private
and are only sent to the requester by direct message.
*/
func formatApprovedLeaveChannelMessage(api plugin.API, notification service.LeaveDecisionNotification) string {
	copy := leaveNotificationCopyForLanguage(notification.Language)
	requesterLabel := userMentionOrID(api, notification.RequesterUserID)
	deciderLabel := userMentionOrID(api, notification.DeciderUserID)
	workspaceLabel := channelReferenceOrWorkspaceName(api, notification.ChannelID, notification.WorkspaceName, "the workspace channel")

	lines := []string{
		formatNotificationHeading(copy.ChannelApprovedTitle),
		"",
		fmt.Sprintf(copy.ChannelApprovedSummary, requesterLabel, notification.LeaveTypeName),
		formatLabeledInlineValue(copy.WorkspaceLabel, workspaceLabel),
		formatLabeledInlineValue(copy.DatesLabel, formatDateRange(notification.StartDate, notification.EndDate)),
		formatLabeledInlineValue(copy.ApprovedByLabel, deciderLabel),
	}

	lines = appendLeaveRequestDetails(lines, copy, notification.DurationMode, notification.HalfDayPart, notification.StartTime, notification.EndTime)
	lines = append(lines, formatLabeledInlineValue(copy.CanContactLabel, translateBoolean(notification.CanContactIfNeeded, copy)))

	return strings.Join(lines, "\n")
}

/*
appendLabeledMultilineValue appends a markdown label and puts the value on its own line.

This keeps multiline Persian/RTL and normal multiline text readable instead of
putting the first line beside the label and the remaining lines below it.
*/
func appendLabeledMultilineValue(lines []string, label string, value string) []string {
	cleanValue := strings.TrimSpace(value)
	if cleanValue == "" {
		return lines
	}

	return append(lines, fmt.Sprintf("**%s:**", label), cleanValue)
}

/*
formatLeaveCancelledMessage formats the leave cancellation notification.
*/
func formatLeaveCancelledMessage(api plugin.API, notification service.LeaveCancellationNotification) string {
	copy := leaveNotificationCopyForLanguage(notification.Language)
	requesterLabel := userMentionOrID(api, notification.RequesterUserID)
	previousStatus := copy.PendingStatus
	if notification.WasApproved {
		previousStatus = copy.ApprovedStatus
	}

	lines := []string{
		formatNotificationHeading(copy.CancelledTitle),
		"",
		fmt.Sprintf(copy.CancelledSummary, requesterLabel, notification.LeaveTypeName, previousStatus),
		formatLabeledInlineValue(copy.DatesLabel, formatDateRange(notification.StartDate, notification.EndDate)),
		formatLabeledInlineValue(copy.StatusLabel, translateLeaveStatus(notification.Status, copy)),
	}

	lines = appendLeaveRequestDetails(lines, copy, notification.DurationMode, notification.HalfDayPart, notification.StartTime, notification.EndTime)
	lines = append(lines, formatLabeledInlineValue(copy.CanContactLabel, translateBoolean(notification.CanContactIfNeeded, copy)))

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
	copy := leaveNotificationCopyForLanguage(notification.Language)
	requesterLabel := userMentionOrID(api, notification.RequesterUserID)

	lines := []string{
		formatNotificationHeading(copy.ChannelCancelledTitle),
		"",
		fmt.Sprintf(copy.ChannelCancelledSummary, requesterLabel, notification.LeaveTypeName),
		formatLabeledInlineValue(copy.DatesLabel, formatDateRange(notification.StartDate, notification.EndDate)),
		copy.NoLongerAwayMessage,
	}

	lines = appendLeaveRequestDetails(lines, copy, notification.DurationMode, notification.HalfDayPart, notification.StartTime, notification.EndTime)
	lines = append(lines, formatLabeledInlineValue(copy.CanContactLabel, translateBoolean(notification.CanContactIfNeeded, copy)))

	return strings.Join(lines, "\n")
}

/*
formatUserMentionList formats a readable comma-separated user mention list.
*/
func formatUserMentionList(api plugin.API, userIDs []string, emptyFallback string) string {
	labels := make([]string, 0, len(userIDs))
	for _, userID := range userIDs {
		cleanUserID := strings.TrimSpace(userID)
		if cleanUserID == "" {
			continue
		}

		labels = append(labels, userMentionOrID(api, cleanUserID))
	}

	if len(labels) == 0 {
		return emptyFallback
	}

	return strings.Join(labels, ", ")
}

/*
translateBoolean returns translated yes/no copy for generated notifications.
*/
func translateBoolean(value bool, copy leaveNotificationCopy) string {
	if value {
		return copy.YesLabel
	}

	return copy.NoLabel
}

/*
formatNotificationHeading returns a Mattermost Markdown h4 heading.

Notification titles are always formatted through this helper so direct messages
and channel announcements share the same readable heading treatment without
duplicating Markdown prefixes in each translated copy string.
*/
func formatNotificationHeading(title string) string {
	cleanTitle := strings.TrimSpace(title)
	if cleanTitle == "" {
		return ""
	}

	cleanTitle = strings.TrimLeft(cleanTitle, "# ")

	return "#### " + cleanTitle
}

/*
formatDateRange returns a compact date-range label.
*/
func formatDateRange(startDate string, endDate string) string {
	if strings.TrimSpace(startDate) == strings.TrimSpace(endDate) {
		return strings.TrimSpace(startDate)
	}

	return fmt.Sprintf("%s → %s", startDate, endDate)
}

/*
formatLabeledInlineValue formats one bold markdown label and value.
*/
func formatLabeledInlineValue(label string, value string) string {
	return fmt.Sprintf("**%s:** %s", label, value)
}

/*
appendLeaveRequestDetails appends translated mode-specific leave detail copy.
*/
func appendLeaveRequestDetails(
	lines []string,
	copy leaveNotificationCopy,
	durationMode string,
	halfDayPart string,
	startTime string,
	endTime string,
) []string {
	details := formatLeaveRequestDetails(copy, durationMode, halfDayPart, startTime, endTime)
	if details == "" {
		return lines
	}

	return append(lines, details)
}

/*
formatLeaveRequestDetails returns translated mode-specific leave detail copy.
*/
func formatLeaveRequestDetails(
	copy leaveNotificationCopy,
	durationMode string,
	halfDayPart string,
	startTime string,
	endTime string,
) string {
	switch durationMode {
	case string(domain.LeaveDurationHalfDay):
		cleanPart := strings.TrimSpace(halfDayPart)
		if cleanPart == "" {
			return formatLabeledInlineValue(copy.DurationLabel, copy.HalfDayDuration)
		}

		return formatLabeledInlineValue(copy.DurationLabel, fmt.Sprintf("%s, %s", copy.HalfDayDuration, translateHalfDayPart(cleanPart, copy)))

	case string(domain.LeaveDurationHourly):
		if strings.TrimSpace(startTime) == "" || strings.TrimSpace(endTime) == "" {
			return formatLabeledInlineValue(copy.DurationLabel, copy.HourlyDuration)
		}

		return formatLabeledInlineValue(copy.DurationLabel, fmt.Sprintf("%s → %s", startTime, endTime))

	default:
		return ""
	}
}

/*
translateLeaveStatus returns a notification-language status label.
*/
func translateLeaveStatus(status string, copy leaveNotificationCopy) string {
	switch domain.LeaveStatus(status) {
	case domain.LeaveStatusApproved:
		return copy.ApprovedStatus
	case domain.LeaveStatusRejected:
		return copy.RejectedStatus
	case domain.LeaveStatusCancelled:
		return copy.CancelledStatus
	default:
		return copy.PendingStatus
	}
}

/*
translateLeaveChangeDecision returns a notification-language label for a leave edit decision.
*/
func translateLeaveChangeDecision(status string, copy leaveNotificationCopy) string {
	switch domain.LeaveChangeRequestStatus(status) {
	case domain.LeaveChangeRequestStatusApproved:
		return copy.ApprovedStatus
	case domain.LeaveChangeRequestStatusRejected:
		return copy.RejectedStatus
	default:
		return copy.PendingStatus
	}
}

/*
translateHalfDayPart returns a notification-language half-day label.
*/
func translateHalfDayPart(part string, copy leaveNotificationCopy) string {
	switch strings.TrimSpace(part) {
	case string(domain.LeaveHalfDayMorning):
		return copy.MorningPart
	case string(domain.LeaveHalfDayAfternoon):
		return copy.AfternoonPart
	default:
		return part
	}
}

/*
leaveNotificationCopy contains generated leave notification copy.
*/
type leaveNotificationCopy struct {
	RequestTitle            string
	RequestSummary          string
	WorkspaceLabel          string
	DatesLabel              string
	StatusLabel             string
	ReasonLabel             string
	BackupLabel             string
	CanContactLabel         string
	YesLabel                string
	NoLabel                 string
	RequestSubmittedTitle   string
	RequestSubmittedSummary string
	NotifiedRecipientsLabel string
	NoRecipientFallback     string
	OpenCampfireInstruction string
	DecisionTitle           string
	DecisionSummary         string
	ApprovedTitle           string
	ApprovedSummary         string
	RejectedTitle           string
	RejectedSummary         string
	ChannelApprovedTitle    string
	ChannelCancelledTitle   string
	ChannelApprovedSummary  string
	ApprovedByLabel         string
	CommentLabel            string
	CancelledTitle          string
	CancelledSummary        string
	ChannelCancelledSummary string
	NoLongerAwayMessage     string
	ChangeRequestTitle      string
	ChangeRequestSummary    string
	ChangeSubmittedTitle    string
	ChangeSubmittedSummary  string
	ChangeDecisionTitle     string
	ChangeDecisionSummary   string
	ChangeApprovedTitle     string
	ChangeApprovedSummary   string
	ChangeRejectedTitle     string
	ChangeRejectedSummary   string
	UpdatedTitle            string
	UpdatedSummary          string
	DurationLabel           string
	HalfDayDuration         string
	HourlyDuration          string
	MorningPart             string
	AfternoonPart           string
	PendingStatus           string
	ApprovedStatus          string
	RejectedStatus          string
	CancelledStatus         string
}

/*
leaveNotificationCopyForLanguage returns generated notification copy in the requested language.
*/
func leaveNotificationCopyForLanguage(language domain.ReportLanguage) leaveNotificationCopy {
	switch language {
	case domain.ReportLanguagePersian:
		return leaveNotificationCopy{
			RequestTitle:            "درخواست مرخصی 🔥",
			RequestSummary:          "کاربر %s درخواست مرخصی **%s** ثبت کرده است.",
			WorkspaceLabel:          "فضای کاری",
			DatesLabel:              "تاریخ‌ها",
			StatusLabel:             "وضعیت",
			ReasonLabel:             "توضیحات",
			BackupLabel:             "جانشین",
			CanContactLabel:         "امکان تماس در صورت نیاز",
			YesLabel:                "بله",
			NoLabel:                 "خیر",
			RequestSubmittedTitle:   "درخواست مرخصی ثبت شد ✅",
			RequestSubmittedSummary: "درخواست مرخصی **%s** شما ثبت شد.",
			NotifiedRecipientsLabel: "اطلاع‌رسانی شد به",
			NoRecipientFallback:     "هیچ کاربری",
			OpenCampfireInstruction: "برای تایید یا رد این درخواست، صفحه فضای کاری را باز کنید.",
			DecisionTitle:           "به‌روزرسانی مرخصی 🔥",
			DecisionSummary:         "درخواست مرخصی **%s** شما با وضعیت **%s** توسط کاربر %s ثبت شد.",
			ApprovedTitle:           "مرخصی شما تایید شد ✅",
			ApprovedSummary:         "درخواست مرخصی **%s** شما توسط کاربر %s تایید شد",
			RejectedTitle:           "مرخصی شما رد شد ❌",
			RejectedSummary:         "درخواست مرخصی **%s** شما توسط کاربر %s رد شد",
			ChannelApprovedTitle:    "اعلام مرخصی تاییدشده ✅",
			ChannelCancelledTitle:   "لغو مرخصی تاییدشده ↩️",
			ChannelApprovedSummary:  "کاربر %s در مرخصی تاییدشده **%s** خواهد بود.",
			ApprovedByLabel:         "تاییدکننده",
			CommentLabel:            "یادداشت",
			CancelledTitle:          "مرخصی لغو شد 🔥",
			CancelledSummary:        "کاربر %s درخواست مرخصی **%s** خود با وضعیت قبلی %s را لغو کرد.",
			ChannelCancelledSummary: "کاربر %s مرخصی تاییدشده **%s** خود را لغو کرد.",
			NoLongerAwayMessage:     "این کاربر دیگر برای این بازه غایب محسوب نمی‌شود.",
			ChangeRequestTitle:      "درخواست ویرایش مرخصی 🔥",
			ChangeRequestSummary:    "کاربر %s درخواست کرده است مرخصی **%s** خود را ویرایش کند.",
			ChangeSubmittedTitle:    "درخواست ویرایش مرخصی ثبت شد ✅",
			ChangeSubmittedSummary:  "درخواست ویرایش مرخصی **%s** شما ثبت شد و منتظر تأیید است.",
			ChangeDecisionTitle:     "نتیجه درخواست ویرایش مرخصی 🔥",
			ChangeDecisionSummary:   "درخواست ویرایش مرخصی **%s** شما با وضعیت **%s** توسط کاربر %s ثبت شد.",
			ChangeApprovedTitle:     "ویرایش مرخصی تأیید شد ✅",
			ChangeApprovedSummary:   "درخواست ویرایش مرخصی **%s** شما توسط کاربر %s تأیید و اعمال شد.",
			ChangeRejectedTitle:     "ویرایش مرخصی رد شد ❌",
			ChangeRejectedSummary:   "درخواست ویرایش مرخصی **%s** شما توسط کاربر %s رد شد.",
			UpdatedTitle:            "مرخصی شما ویرایش شد ✅",
			UpdatedSummary:          "مرخصی **%s** شما توسط کاربر %s ویرایش شد.",
			DurationLabel:           "مدت",
			HalfDayDuration:         "نیم‌روز",
			HourlyDuration:          "ساعتی",
			MorningPart:             "صبح",
			AfternoonPart:           "بعدازظهر",
			PendingStatus:           "در انتظار",
			ApprovedStatus:          "تاییدشده",
			RejectedStatus:          "ردشده",
			CancelledStatus:         "لغوشده",
		}

	case domain.ReportLanguageArabic:
		return leaveNotificationCopy{
			RequestTitle:            "طلب إجازة 🔥",
			RequestSummary:          "المستخدم %s طلب إجازة **%s**.",
			WorkspaceLabel:          "مساحة العمل",
			DatesLabel:              "التواريخ",
			StatusLabel:             "الحالة",
			ReasonLabel:             "ملاحظات",
			BackupLabel:             "البديل",
			CanContactLabel:         "إمكانية الاتصال عند الحاجة",
			YesLabel:                "نعم",
			NoLabel:                 "لا",
			RequestSubmittedTitle:   "تم إرسال طلب الإجازة ✅",
			RequestSubmittedSummary: "تم إرسال طلب إجازة **%s** الخاص بك.",
			NotifiedRecipientsLabel: "تم إشعار",
			NoRecipientFallback:     "لا يوجد مستخدمون",
			OpenCampfireInstruction: "افتح صفحة مساحة العمل للموافقة على هذا الطلب أو رفضه.",
			DecisionTitle:           "تحديث الإجازة 🔥",
			DecisionSummary:         "تم تحديث طلب إجازة **%s** الخاص بك إلى **%s** بواسطة المستخدم %s.",
			ApprovedTitle:           "تمت الموافقة على إجازتك ✅",
			ApprovedSummary:         "تمت الموافقة على طلب إجازة **%s** الخاص بك بواسطة المستخدم %s",
			RejectedTitle:           "تم رفض إجازتك ❌",
			RejectedSummary:         "تم رفض طلب إجازة **%s** الخاص بك بواسطة المستخدم %s",
			ChannelApprovedTitle:    "إعلان إجازة معتمدة ✅",
			ChannelCancelledTitle:   "إلغاء إجازة معتمدة ↩️",
			ChannelApprovedSummary:  "المستخدم %s سيكون في إجازة **%s** معتمدة.",
			ApprovedByLabel:         "تمت الموافقة بواسطة",
			CommentLabel:            "ملاحظة",
			CancelledTitle:          "تم إلغاء الإجازة 🔥",
			CancelledSummary:        "المستخدم %s ألغى طلب إجازة **%s** الذي كان %s.",
			ChannelCancelledSummary: "المستخدم %s ألغى إجازة **%s** المعتمدة.",
			NoLongerAwayMessage:     "لم يعد هذا المستخدم مسجلاً كغائب خلال هذه الفترة.",
			ChangeRequestTitle:      "طلب تعديل إجازة 🔥",
			ChangeRequestSummary:    "المستخدم %s طلب تعديل إجازة **%s** الخاصة به.",
			ChangeSubmittedTitle:    "تم إرسال طلب تعديل الإجازة ✅",
			ChangeSubmittedSummary:  "تم إرسال طلب تعديل إجازة **%s** الخاص بك وهو بانتظار الموافقة.",
			ChangeDecisionTitle:     "نتيجة طلب تعديل الإجازة 🔥",
			ChangeDecisionSummary:   "تم تحديث طلب تعديل إجازة **%s** الخاص بك إلى **%s** بواسطة المستخدم %s.",
			ChangeApprovedTitle:     "تمت الموافقة على تعديل الإجازة ✅",
			ChangeApprovedSummary:   "تمت الموافقة على طلب تعديل إجازة **%s** الخاص بك وتطبيقه بواسطة المستخدم %s.",
			ChangeRejectedTitle:     "تم رفض تعديل الإجازة ❌",
			ChangeRejectedSummary:   "تم رفض طلب تعديل إجازة **%s** الخاص بك بواسطة المستخدم %s.",
			UpdatedTitle:            "تم تعديل إجازتك ✅",
			UpdatedSummary:          "تم تعديل إجازة **%s** الخاصة بك بواسطة المستخدم %s.",
			DurationLabel:           "المدة",
			HalfDayDuration:         "نصف يوم",
			HourlyDuration:          "بالساعة",
			MorningPart:             "الصباح",
			AfternoonPart:           "بعد الظهر",
			PendingStatus:           "قيد الانتظار",
			ApprovedStatus:          "معتمدة",
			RejectedStatus:          "مرفوضة",
			CancelledStatus:         "ملغاة",
		}

	default:
		return leaveNotificationCopy{
			RequestTitle:            "🔥 **Leave request**",
			RequestSummary:          "%s requested **%s** leave.",
			WorkspaceLabel:          "Workspace",
			DatesLabel:              "Dates",
			StatusLabel:             "Status",
			ReasonLabel:             "Notes",
			BackupLabel:             "Backup",
			CanContactLabel:         "Can be contacted if needed",
			YesLabel:                "Yes",
			NoLabel:                 "No",
			RequestSubmittedTitle:   "✅ **Leave request submitted**",
			RequestSubmittedSummary: "Your **%s** leave request was submitted.",
			NotifiedRecipientsLabel: "Notified",
			NoRecipientFallback:     "No configured recipients",
			OpenCampfireInstruction: "Open the workspace channel to approve or reject this request.",
			DecisionTitle:           "🔥 **Leave update**",
			DecisionSummary:         "Your **%s** leave request was **%s** by %s.",
			ApprovedTitle:           "✅ **Leave approved**",
			ApprovedSummary:         "Your **%s** leave request was **approved** by %s.",
			RejectedTitle:           "❌ **Leave rejected**",
			RejectedSummary:         "Your **%s** leave request was **rejected** by %s.",
			ChannelApprovedTitle:    "✅ **Approved leave**",
			ChannelCancelledTitle:   "↩️ **Approved leave cancelled**",
			ChannelApprovedSummary:  "%s will be away on approved **%s** leave.",
			ApprovedByLabel:         "Approved by",
			CommentLabel:            "Comment",
			CancelledTitle:          "🔥 **Leave cancelled**",
			CancelledSummary:        "%s cancelled their **%s** leave request that was %s.",
			ChannelCancelledSummary: "%s cancelled their approved **%s** leave.",
			NoLongerAwayMessage:     "They are no longer marked as away for this period.",
			ChangeRequestTitle:      "🔥 **Leave edit requested**",
			ChangeRequestSummary:    "%s requested an edit to their **%s** leave.",
			ChangeSubmittedTitle:    "✅ **Leave edit request submitted**",
			ChangeSubmittedSummary:  "Your edit request for **%s** leave was submitted and is waiting for approval.",
			ChangeDecisionTitle:     "🔥 **Leave edit update**",
			ChangeDecisionSummary:   "Your edit request for **%s** leave was **%s** by %s.",
			ChangeApprovedTitle:     "✅ **Leave edit approved**",
			ChangeApprovedSummary:   "Your edit request for **%s** leave was approved and applied by %s.",
			ChangeRejectedTitle:     "❌ **Leave edit rejected**",
			ChangeRejectedSummary:   "Your edit request for **%s** leave was rejected by %s.",
			UpdatedTitle:            "✅ **Leave updated**",
			UpdatedSummary:          "Your **%s** leave was updated by %s.",
			DurationLabel:           "Duration",
			HalfDayDuration:         "half day",
			HourlyDuration:          "hourly",
			MorningPart:             "morning",
			AfternoonPart:           "afternoon",
			PendingStatus:           "pending",
			ApprovedStatus:          "approved",
			RejectedStatus:          "rejected",
			CancelledStatus:         "cancelled",
		}
	}
}

/*
standupKindLabel returns a generated readable schedule-kind label.
*/
func standupKindLabel(kind domain.StandupKind, language domain.Language) string {
	switch i18n.NormalizeLanguage(string(language), domain.LanguageEnglish) {
	case domain.LanguagePersian:
		if kind == domain.StandupKindWeekly {
			return "هفتگی"
		}

		return "روزانه"

	case domain.LanguageArabic:
		if kind == domain.StandupKindWeekly {
			return "الأسبوعي"
		}

		return "اليومي"

	default:
		if kind == domain.StandupKindWeekly {
			return "weekly"
		}

		return "daily"
	}
}

/*
channelReferenceOrWorkspaceName returns a Mattermost channel reference when possible.

Mattermost renders "~channel-name" as a channel reference. If the channel cannot
be loaded, Campfire falls back to the readable workspace name.
*/
func channelReferenceOrWorkspaceName(api plugin.API, channelID string, workspaceName string, fallback string) string {
	cleanChannelID := strings.TrimSpace(channelID)
	if cleanChannelID != "" {
		channel, appErr := api.GetChannel(cleanChannelID)
		if appErr == nil && channel != nil && strings.TrimSpace(channel.Name) != "" {
			return "~" + channel.Name
		}
	}

	cleanWorkspaceName := strings.TrimSpace(workspaceName)
	if cleanWorkspaceName != "" {
		return fmt.Sprintf("**%s**", cleanWorkspaceName)
	}

	return strings.TrimSpace(fallback)
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
