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

	if err := p.sendDirectMessage(notification.RequesterUserID, formatLeaveChangeDecidedMessage(p.api, notification)); err != nil {
		return err
	}

	if domain.LeaveChangeRequestStatus(notification.Decision) != domain.LeaveChangeRequestStatusApproved {
		return nil
	}

	targetChannelID := notificationTargetChannelID(notification.AnnouncementChannelID, notification.ChannelID)
	if domain.LeaveChangeRequestAction(notification.Action) == domain.LeaveChangeRequestActionDelete {
		return p.sendChannelMessage(
			targetChannelID,
			formatApprovedLeaveCancelledChannelMessage(p.api, service.LeaveCancellationNotification{
				LeaveRequestID:        notification.LeaveRequestID,
				WorkspaceID:           notification.WorkspaceID,
				WorkspaceName:         notification.WorkspaceName,
				ChannelID:             notification.ChannelID,
				Language:              notification.Language,
				AnnouncementChannelID: notification.AnnouncementChannelID,
				RequesterUserID:       notification.RequesterUserID,
				LeaveTypeName:         notification.LeaveTypeName,
				LeaveTypeCode:         notification.LeaveTypeCode,
				StartDate:             notification.StartDate,
				EndDate:               notification.EndDate,
				DurationMode:          notification.DurationMode,
				HalfDayPart:           notification.HalfDayPart,
				StartTime:             notification.StartTime,
				EndTime:               notification.EndTime,
				CanContactIfNeeded:    notification.CanContactIfNeeded,
				Status:                string(domain.LeaveStatusCancelled),
				WasApproved:           true,
			}),
		)
	}

	return p.sendChannelMessage(targetChannelID, formatApprovedLeaveChangedChannelMessage(p.api, notification))
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
		fmt.Sprintf(copy.RequestSummary, requesterLabel, localizedLeaveTypeNameForNotification(notification.LeaveTypeCode, notification.LeaveTypeName, notification.Language)),
		formatLabeledInlineValue(copy.WorkspaceLabel, workspaceLabel),
		formatLabeledInlineValue(copy.DatesLabel, formatLocalizedDateRange(notification.Language, notification.StartDate, notification.EndDate)),
		formatLabeledInlineValue(copy.StatusLabel, translateLeaveStatus(notification.Status, copy)),
	}

	lines = appendLeaveRequestDetails(lines, copy, notification.Language, notification.DurationMode, notification.HalfDayPart, notification.StartTime, notification.EndTime)
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

	lines := []string{
		formatNotificationHeading(copy.RequestSubmittedTitle),
		"",
		fmt.Sprintf(copy.RequestSubmittedSummary, localizedLeaveTypeNameForNotification(notification.LeaveTypeCode, notification.LeaveTypeName, notification.Language)),
		formatLabeledInlineValue(copy.DatesLabel, formatLocalizedDateRange(notification.Language, notification.StartDate, notification.EndDate)),
	}

	lines = appendLeaveRequestDetails(lines, copy, notification.Language, notification.DurationMode, notification.HalfDayPart, notification.StartTime, notification.EndTime)
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

	title := copy.ChangeRequestTitle
	summaryTemplate := copy.ChangeRequestSummary
	if domain.LeaveChangeRequestAction(notification.Action) == domain.LeaveChangeRequestActionDelete {
		title = copy.DeleteRequestTitle
		summaryTemplate = copy.DeleteRequestSummary
	}

	lines := []string{
		formatNotificationHeading(title),
		"",
		fmt.Sprintf(summaryTemplate, requesterLabel, localizedLeaveTypeNameForNotification(notification.LeaveTypeCode, notification.LeaveTypeName, notification.Language)),
		formatLabeledInlineValue(copy.WorkspaceLabel, workspaceLabel),
		formatLabeledInlineValue(copy.DatesLabel, formatLocalizedDateRange(notification.Language, notification.StartDate, notification.EndDate)),
	}

	lines = appendLeaveRequestDetails(lines, copy, notification.Language, notification.DurationMode, notification.HalfDayPart, notification.StartTime, notification.EndTime)
	lines = appendLabeledMultilineValue(lines, copy.ReasonLabel, notification.Reason)

	if domain.LeaveChangeRequestAction(notification.Action) == domain.LeaveChangeRequestActionDelete {
		lines = append(lines, "", copy.DeleteApprovalInstruction)
	}

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

	title := copy.ChangeSubmittedTitle
	summaryTemplate := copy.ChangeSubmittedSummary
	if domain.LeaveChangeRequestAction(notification.Action) == domain.LeaveChangeRequestActionDelete {
		title = copy.DeleteSubmittedTitle
		summaryTemplate = copy.DeleteSubmittedSummary
	}

	lines := []string{
		formatNotificationHeading(title),
		"",
		fmt.Sprintf(summaryTemplate, localizedLeaveTypeNameForNotification(notification.LeaveTypeCode, notification.LeaveTypeName, notification.Language)),
		formatLabeledInlineValue(copy.DatesLabel, formatLocalizedDateRange(notification.Language, notification.StartDate, notification.EndDate)),
	}

	lines = appendLeaveRequestDetails(lines, copy, notification.Language, notification.DurationMode, notification.HalfDayPart, notification.StartTime, notification.EndTime)

	return strings.Join(lines, "\n")
}

/*
formatLeaveChangeDecidedMessage formats the requester-facing decision for an edit request.
*/
func formatLeaveChangeDecidedMessage(api plugin.API, notification service.LeaveChangeDecisionNotification) string {
	copy := leaveNotificationCopyForLanguage(notification.Language)
	deciderLabel := userMentionOrID(api, notification.DeciderUserID)
	decisionLabel := translateLeaveChangeDecision(notification.Decision, copy)

	leaveTypeLabel := localizedLeaveTypeNameForNotification(notification.LeaveTypeCode, notification.LeaveTypeName, notification.Language)
	deleteAction := domain.LeaveChangeRequestAction(notification.Action) == domain.LeaveChangeRequestActionDelete
	header := copy.ChangeDecisionTitle
	summaryTemplate := copy.ChangeDecisionSummary
	if deleteAction {
		header = copy.DeleteDecisionTitle
		summaryTemplate = copy.DeleteDecisionSummary
	}
	summary := fmt.Sprintf(summaryTemplate, leaveTypeLabel, decisionLabel, deciderLabel)
	if domain.LeaveChangeRequestStatus(notification.Decision) == domain.LeaveChangeRequestStatusApproved {
		header = copy.ChangeApprovedTitle
		summaryTemplate = copy.ChangeApprovedSummary
		if deleteAction {
			header = copy.DeleteApprovedTitle
			summaryTemplate = copy.DeleteApprovedSummary
		}
		summary = fmt.Sprintf(summaryTemplate, leaveTypeLabel, deciderLabel)
	}
	if domain.LeaveChangeRequestStatus(notification.Decision) == domain.LeaveChangeRequestStatusRejected {
		header = copy.ChangeRejectedTitle
		summaryTemplate = copy.ChangeRejectedSummary
		if deleteAction {
			header = copy.DeleteRejectedTitle
			summaryTemplate = copy.DeleteRejectedSummary
		}
		summary = fmt.Sprintf(summaryTemplate, leaveTypeLabel, deciderLabel)
	}

	lines := []string{
		formatNotificationHeading(header),
		"",
		summary,
		formatLabeledInlineValue(copy.DatesLabel, formatLocalizedDateRange(notification.Language, notification.StartDate, notification.EndDate)),
	}

	lines = appendLeaveRequestDetails(lines, copy, notification.Language, notification.DurationMode, notification.HalfDayPart, notification.StartTime, notification.EndTime)
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
		fmt.Sprintf(copy.UpdatedSummary, localizedLeaveTypeNameForNotification(notification.LeaveTypeCode, notification.LeaveTypeName, notification.Language), editorLabel),
		formatLabeledInlineValue(copy.DatesLabel, formatLocalizedDateRange(notification.Language, notification.StartDate, notification.EndDate)),
	}

	lines = appendLeaveRequestDetails(lines, copy, notification.Language, notification.DurationMode, notification.HalfDayPart, notification.StartTime, notification.EndTime)
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
	summary := fmt.Sprintf(copy.DecisionSummary, localizedLeaveTypeNameForNotification(notification.LeaveTypeCode, notification.LeaveTypeName, notification.Language), translateLeaveStatus(notification.Decision, copy), deciderLabel)

	switch domain.LeaveStatus(notification.Decision) {
	case domain.LeaveStatusApproved:
		header = copy.ApprovedTitle
		summary = fmt.Sprintf(copy.ApprovedSummary, localizedLeaveTypeNameForNotification(notification.LeaveTypeCode, notification.LeaveTypeName, notification.Language), deciderLabel)

	case domain.LeaveStatusRejected:
		header = copy.RejectedTitle
		summary = fmt.Sprintf(copy.RejectedSummary, localizedLeaveTypeNameForNotification(notification.LeaveTypeCode, notification.LeaveTypeName, notification.Language), deciderLabel)
	}

	lines := []string{
		formatNotificationHeading(header),
		"",
		summary,
		formatLabeledInlineValue(copy.DatesLabel, formatLocalizedDateRange(notification.Language, notification.StartDate, notification.EndDate)),
	}

	lines = appendLeaveRequestDetails(lines, copy, notification.Language, notification.DurationMode, notification.HalfDayPart, notification.StartTime, notification.EndTime)
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
		fmt.Sprintf(copy.ChannelApprovedSummary, requesterLabel, localizedLeaveTypeNameForNotification(notification.LeaveTypeCode, notification.LeaveTypeName, notification.Language)),
		formatLabeledInlineValue(copy.WorkspaceLabel, workspaceLabel),
		formatLabeledInlineValue(copy.DatesLabel, formatLocalizedDateRange(notification.Language, notification.StartDate, notification.EndDate)),
		formatLabeledInlineValue(copy.ApprovedByLabel, deciderLabel),
	}

	lines = appendLeaveRequestDetails(lines, copy, notification.Language, notification.DurationMode, notification.HalfDayPart, notification.StartTime, notification.EndTime)
	lines = append(lines, formatLabeledInlineValue(copy.CanContactLabel, translateBoolean(notification.CanContactIfNeeded, copy)))

	return strings.Join(lines, "\n")
}

/*
formatApprovedLeaveChangedChannelMessage formats the team-facing announcement
for an approved member-requested edit to an already tracked leave.
*/
func formatApprovedLeaveChangedChannelMessage(api plugin.API, notification service.LeaveChangeDecisionNotification) string {
	copy := leaveNotificationCopyForLanguage(notification.Language)
	requesterLabel := userMentionOrID(api, notification.RequesterUserID)
	deciderLabel := userMentionOrID(api, notification.DeciderUserID)
	workspaceLabel := channelReferenceOrWorkspaceName(api, notification.ChannelID, notification.WorkspaceName, "the workspace channel")

	lines := []string{
		formatNotificationHeading(copy.ChannelChangedTitle),
		"",
		fmt.Sprintf(copy.ChannelChangedSummary, requesterLabel, localizedLeaveTypeNameForNotification(notification.LeaveTypeCode, notification.LeaveTypeName, notification.Language)),
		formatLabeledInlineValue(copy.WorkspaceLabel, workspaceLabel),
		formatLabeledInlineValue(copy.DatesLabel, formatLocalizedDateRange(notification.Language, notification.StartDate, notification.EndDate)),
		formatLabeledInlineValue(copy.ApprovedByLabel, deciderLabel),
	}

	lines = appendLeaveRequestDetails(lines, copy, notification.Language, notification.DurationMode, notification.HalfDayPart, notification.StartTime, notification.EndTime)
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
		fmt.Sprintf(copy.CancelledSummary, requesterLabel, localizedLeaveTypeNameForNotification(notification.LeaveTypeCode, notification.LeaveTypeName, notification.Language), previousStatus),
		formatLabeledInlineValue(copy.DatesLabel, formatLocalizedDateRange(notification.Language, notification.StartDate, notification.EndDate)),
		formatLabeledInlineValue(copy.StatusLabel, translateLeaveStatus(notification.Status, copy)),
	}

	lines = appendLeaveRequestDetails(lines, copy, notification.Language, notification.DurationMode, notification.HalfDayPart, notification.StartTime, notification.EndTime)
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
		fmt.Sprintf(copy.ChannelCancelledSummary, requesterLabel, localizedLeaveTypeNameForNotification(notification.LeaveTypeCode, notification.LeaveTypeName, notification.Language)),
		formatLabeledInlineValue(copy.DatesLabel, formatLocalizedDateRange(notification.Language, notification.StartDate, notification.EndDate)),
		copy.NoLongerAwayMessage,
	}

	lines = appendLeaveRequestDetails(lines, copy, notification.Language, notification.DurationMode, notification.HalfDayPart, notification.StartTime, notification.EndTime)
	lines = append(lines, formatLabeledInlineValue(copy.CanContactLabel, translateBoolean(notification.CanContactIfNeeded, copy)))

	return strings.Join(lines, "\n")
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
formatLocalizedDateRange returns a compact generated-message date range.

Campfire stores leave dates as workspace-local Gregorian ISO dates. Persian
generated messages should not expose those ISO dates directly because the UI
already presents the same dates with the Persian calendar. This helper keeps the
stored value canonical while rendering human-facing notifications in the
notification language.
*/
func formatLocalizedDateRange(language domain.ReportLanguage, startDate string, endDate string) string {
	formattedStart := formatLocalizedDate(language, startDate)
	formattedEnd := formatLocalizedDate(language, endDate)

	if strings.TrimSpace(startDate) == strings.TrimSpace(endDate) {
		return formattedStart
	}

	return fmt.Sprintf("%s → %s", formattedStart, formattedEnd)
}

/*
formatLocalizedDate renders one workspace-local ISO date for generated messages.
*/
func formatLocalizedDate(language domain.ReportLanguage, dateValue string) string {
	cleanDate := strings.TrimSpace(dateValue)
	year, month, day, ok := parseISODateParts(cleanDate)
	if !ok {
		return localizeNumberString(language, cleanDate)
	}

	switch language {
	case domain.ReportLanguagePersian:
		jalaliYear, jalaliMonth, jalaliDay := gregorianToJalali(year, month, day)

		return toPersianDigits(fmt.Sprintf("%d %s %d", jalaliDay, persianMonthName(jalaliMonth), jalaliYear))

	case domain.ReportLanguageArabic:
		return toArabicDigits(fmt.Sprintf("%d %s %d", day, arabicGregorianMonthName(month), year))

	default:
		return cleanDate
	}
}

/*
formatLocalizedTimeOfDay renders an HH:mm workspace-local time in the generated
message language without changing the underlying local time value.
*/
func formatLocalizedTimeOfDay(language domain.ReportLanguage, timeValue string) string {
	return localizeNumberString(language, strings.TrimSpace(timeValue))
}

/*
parseISODateParts parses a canonical YYYY-MM-DD date into Gregorian parts.
*/
func parseISODateParts(value string) (int, int, int, bool) {
	var year int
	var month int
	var day int

	if _, err := fmt.Sscanf(value, "%04d-%02d-%02d", &year, &month, &day); err != nil {
		return 0, 0, 0, false
	}

	if month < 1 || month > 12 || day < 1 || day > 31 {
		return 0, 0, 0, false
	}

	return year, month, day, true
}

/*
gregorianToJalali converts a Gregorian date to the Persian Jalali calendar.

The algorithm is integer-only and is intentionally kept local to notification
rendering so Campfire storage and API contracts remain Gregorian ISO dates.
*/
func gregorianToJalali(gy int, gm int, gd int) (int, int, int) {
	gDaysInMonth := []int{31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31}
	jDaysInMonth := []int{31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29}

	gy -= 1600
	gm--
	gd--

	gDayNumber := 365*gy + (gy+3)/4 - (gy+99)/100 + (gy+399)/400
	for i := 0; i < gm; i++ {
		gDayNumber += gDaysInMonth[i]
	}

	if gm > 1 && ((gy+1600)%4 == 0 && ((gy+1600)%100 != 0 || (gy+1600)%400 == 0)) {
		gDayNumber++
	}

	gDayNumber += gd
	jDayNumber := gDayNumber - 79
	jNp := jDayNumber / 12053
	jDayNumber %= 12053

	jy := 979 + 33*jNp + 4*(jDayNumber/1461)
	jDayNumber %= 1461

	if jDayNumber >= 366 {
		jy += (jDayNumber - 1) / 365
		jDayNumber = (jDayNumber - 1) % 365
	}

	jm := 0
	for jm < 11 && jDayNumber >= jDaysInMonth[jm] {
		jDayNumber -= jDaysInMonth[jm]
		jm++
	}

	return jy, jm + 1, jDayNumber + 1
}

/*
persianMonthName returns the Persian Jalali month name for a 1-based month.
*/
func persianMonthName(month int) string {
	months := []string{
		"فروردین",
		"اردیبهشت",
		"خرداد",
		"تیر",
		"مرداد",
		"شهریور",
		"مهر",
		"آبان",
		"آذر",
		"دی",
		"بهمن",
		"اسفند",
	}

	if month < 1 || month > len(months) {
		return ""
	}

	return months[month-1]
}

/*
arabicGregorianMonthName returns an Arabic Gregorian month name for a 1-based month.
*/
func arabicGregorianMonthName(month int) string {
	months := []string{
		"يناير",
		"فبراير",
		"مارس",
		"أبريل",
		"مايو",
		"يونيو",
		"يوليو",
		"أغسطس",
		"سبتمبر",
		"أكتوبر",
		"نوفمبر",
		"ديسمبر",
	}

	if month < 1 || month > len(months) {
		return ""
	}

	return months[month-1]
}

/*
localizeNumberString localizes digits without changing separators or text.
*/
func localizeNumberString(language domain.ReportLanguage, value string) string {
	switch language {
	case domain.ReportLanguagePersian:
		return toPersianDigits(value)
	case domain.ReportLanguageArabic:
		return toArabicDigits(value)
	default:
		return value
	}
}

/*
toPersianDigits converts ASCII digits to Persian digits.
*/
func toPersianDigits(value string) string {
	return strings.NewReplacer(
		"0", "۰",
		"1", "۱",
		"2", "۲",
		"3", "۳",
		"4", "۴",
		"5", "۵",
		"6", "۶",
		"7", "۷",
		"8", "۸",
		"9", "۹",
	).Replace(value)
}

/*
toArabicDigits converts ASCII digits to Arabic-Indic digits.
*/
func toArabicDigits(value string) string {
	return strings.NewReplacer(
		"0", "٠",
		"1", "١",
		"2", "٢",
		"3", "٣",
		"4", "٤",
		"5", "٥",
		"6", "٦",
		"7", "٧",
		"8", "٨",
		"9", "٩",
	).Replace(value)
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
	language domain.ReportLanguage,
	durationMode string,
	halfDayPart string,
	startTime string,
	endTime string,
) []string {
	details := formatLeaveRequestDetails(copy, language, durationMode, halfDayPart, startTime, endTime)
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
	language domain.ReportLanguage,
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

		return formatLabeledInlineValue(copy.DurationLabel, fmt.Sprintf("%s%s %s", copy.HalfDayDuration, durationValueSeparator(language), translateHalfDayPart(cleanPart, copy)))

	case string(domain.LeaveDurationHourly):
		if strings.TrimSpace(startTime) == "" || strings.TrimSpace(endTime) == "" {
			return formatLabeledInlineValue(copy.DurationLabel, copy.HourlyDuration)
		}

		return formatLabeledInlineValue(
			copy.DurationLabel,
			fmt.Sprintf(
				"%s%s %s → %s",
				copy.HourlyDuration,
				durationValueSeparator(language),
				formatLocalizedTimeOfDay(language, startTime),
				formatLocalizedTimeOfDay(language, endTime),
			),
		)

	case string(domain.LeaveDurationFullDay), "":
		return formatLabeledInlineValue(copy.DurationLabel, copy.FullDayDuration)

	default:
		return formatLabeledInlineValue(copy.DurationLabel, localizeNumberString(language, strings.TrimSpace(durationMode)))
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
durationValueSeparator returns a natural separator between duration mode and details.
*/
func durationValueSeparator(language domain.ReportLanguage) string {
	switch language {
	case domain.ReportLanguagePersian, domain.ReportLanguageArabic:
		return "،"
	default:
		return ","
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
localizedLeaveTypeNameForNotification maps built-in leave types to generated
message language while preserving custom admin-authored leave type names.
*/
func localizedLeaveTypeNameForNotification(code string, name string, language domain.ReportLanguage) string {
	normalizedCode := normalizeLeaveTypeToken(code)
	normalizedName := normalizeLeaveTypeToken(name)
	normalizedValue := normalizedCode
	if normalizedValue == "" {
		normalizedValue = normalizedName
	}

	switch normalizedValue {
	case "vacation", "custom", "personal":
		switch language {
		case domain.ReportLanguagePersian:
			return "شخصی"
		case domain.ReportLanguageArabic:
			return "إجازة شخصية"
		default:
			return "Personal"
		}
	case "sick":
		switch language {
		case domain.ReportLanguagePersian:
			return "بیماری"
		case domain.ReportLanguageArabic:
			return "إجازة مرضية"
		default:
			return "Sick"
		}
	case "remote_wfh", "remote", "wfh", "wfh_remote", "remote_wfh_":
		switch language {
		case domain.ReportLanguagePersian:
			return "دورکاری"
		case domain.ReportLanguageArabic:
			return "عمل عن بُعد"
		default:
			return "WFH/Remote"
		}
	default:
		return strings.TrimSpace(name)
	}
}

/*
normalizeLeaveTypeToken converts a leave type code or seeded English name into a
stable token for built-in leave type localization.
*/
func normalizeLeaveTypeToken(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	normalized = strings.NewReplacer(
		" ", "_",
		"-", "_",
		"/", "_",
	).Replace(normalized)

	return strings.Trim(normalized, "_")
}

/*
leaveNotificationCopy contains generated leave notification copy.
*/
type leaveNotificationCopy struct {
	RequestTitle              string
	RequestSummary            string
	WorkspaceLabel            string
	DatesLabel                string
	StatusLabel               string
	ReasonLabel               string
	BackupLabel               string
	CanContactLabel           string
	YesLabel                  string
	NoLabel                   string
	RequestSubmittedTitle     string
	RequestSubmittedSummary   string
	OpenCampfireInstruction   string
	DecisionTitle             string
	DecisionSummary           string
	ApprovedTitle             string
	ApprovedSummary           string
	RejectedTitle             string
	RejectedSummary           string
	ChannelApprovedTitle      string
	ChannelCancelledTitle     string
	ChannelChangedTitle       string
	ChannelApprovedSummary    string
	ChannelChangedSummary     string
	ApprovedByLabel           string
	CommentLabel              string
	CancelledTitle            string
	CancelledSummary          string
	ChannelCancelledSummary   string
	NoLongerAwayMessage       string
	ChangeRequestTitle        string
	ChangeRequestSummary      string
	ChangeSubmittedTitle      string
	ChangeSubmittedSummary    string
	ChangeDecisionTitle       string
	ChangeDecisionSummary     string
	ChangeApprovedTitle       string
	ChangeApprovedSummary     string
	ChangeRejectedTitle       string
	ChangeRejectedSummary     string
	DeleteRequestTitle        string
	DeleteRequestSummary      string
	DeleteSubmittedTitle      string
	DeleteSubmittedSummary    string
	DeleteDecisionTitle       string
	DeleteDecisionSummary     string
	DeleteApprovedTitle       string
	DeleteApprovedSummary     string
	DeleteRejectedTitle       string
	DeleteRejectedSummary     string
	DeleteApprovalInstruction string
	UpdatedTitle              string
	UpdatedSummary            string
	DurationLabel             string
	FullDayDuration           string
	HalfDayDuration           string
	HourlyDuration            string
	MorningPart               string
	AfternoonPart             string
	PendingStatus             string
	ApprovedStatus            string
	RejectedStatus            string
	CancelledStatus           string
}

/*
leaveNotificationCopyForLanguage returns generated notification copy in the requested language.
*/
func leaveNotificationCopyForLanguage(language domain.ReportLanguage) leaveNotificationCopy {
	switch language {
	case domain.ReportLanguagePersian:
		return leaveNotificationCopy{
			RequestTitle:              "درخواست مرخصی 🔥",
			RequestSummary:            "کاربر %s درخواست مرخصی **%s** ثبت کرده است.",
			WorkspaceLabel:            "فضای کاری",
			DatesLabel:                "تاریخ‌ها",
			StatusLabel:               "وضعیت",
			ReasonLabel:               "توضیحات",
			BackupLabel:               "جانشین",
			CanContactLabel:           "امکان تماس در صورت نیاز",
			YesLabel:                  "بله",
			NoLabel:                   "خیر",
			RequestSubmittedTitle:     "درخواست مرخصی ثبت شد ✅",
			RequestSubmittedSummary:   "درخواست مرخصی **%s** شما ثبت شد.",
			OpenCampfireInstruction:   "برای تایید یا رد این درخواست، صفحه فضای کاری را باز کنید.",
			DecisionTitle:             "به‌روزرسانی مرخصی 🔥",
			DecisionSummary:           "درخواست مرخصی **%s** شما با وضعیت **%s** توسط کاربر %s ثبت شد.",
			ApprovedTitle:             "مرخصی شما تایید شد ✅",
			ApprovedSummary:           "درخواست مرخصی **%s** شما توسط کاربر %s تایید شد",
			RejectedTitle:             "مرخصی شما رد شد ❌",
			RejectedSummary:           "درخواست مرخصی **%s** شما توسط کاربر %s رد شد",
			ChannelApprovedTitle:      "اعلام مرخصی تاییدشده ✅",
			ChannelCancelledTitle:     "لغو مرخصی تاییدشده ↩️",
			ChannelChangedTitle:       "به‌روزرسانی مرخصی تاییدشده 🔁",
			ChannelApprovedSummary:    "کاربر %s در مرخصی تاییدشده **%s** خواهد بود.",
			ChannelChangedSummary:     "مرخصی تاییدشده کاربر %s با نوع **%s** به‌روزرسانی شد.",
			ApprovedByLabel:           "تاییدکننده",
			CommentLabel:              "یادداشت",
			CancelledTitle:            "مرخصی لغو شد 🔥",
			CancelledSummary:          "کاربر %s درخواست مرخصی **%s** خود با وضعیت قبلی %s را لغو کرد.",
			ChannelCancelledSummary:   "کاربر %s مرخصی تاییدشده **%s** خود را لغو کرد.",
			NoLongerAwayMessage:       "این کاربر دیگر برای این بازه غایب محسوب نمی‌شود.",
			ChangeRequestTitle:        "درخواست ویرایش مرخصی 🔥",
			ChangeRequestSummary:      "کاربر %s درخواست کرده است مرخصی **%s** خود را ویرایش کند.",
			ChangeSubmittedTitle:      "درخواست ویرایش مرخصی ثبت شد ✅",
			ChangeSubmittedSummary:    "درخواست ویرایش مرخصی **%s** شما ثبت شد و منتظر تأیید است.",
			ChangeDecisionTitle:       "نتیجه درخواست ویرایش مرخصی 🔥",
			ChangeDecisionSummary:     "درخواست ویرایش مرخصی **%s** شما با وضعیت **%s** توسط کاربر %s ثبت شد.",
			ChangeApprovedTitle:       "ویرایش مرخصی تأیید شد ✅",
			ChangeApprovedSummary:     "درخواست ویرایش مرخصی **%s** شما توسط کاربر %s تأیید و اعمال شد.",
			ChangeRejectedTitle:       "ویرایش مرخصی رد شد ❌",
			ChangeRejectedSummary:     "درخواست ویرایش مرخصی **%s** شما توسط کاربر %s رد شد.",
			DeleteRequestTitle:        "درخواست حذف مرخصی 🔥",
			DeleteRequestSummary:      "کاربر %s درخواست کرده است مرخصی **%s** خود را حذف کند.",
			DeleteSubmittedTitle:      "درخواست حذف مرخصی ثبت شد ✅",
			DeleteSubmittedSummary:    "درخواست حذف مرخصی **%s** شما ثبت شد و منتظر تأیید است.",
			DeleteDecisionTitle:       "نتیجه درخواست حذف مرخصی 🔥",
			DeleteDecisionSummary:     "درخواست حذف مرخصی **%s** شما با وضعیت **%s** توسط کاربر %s ثبت شد.",
			DeleteApprovedTitle:       "حذف مرخصی تأیید شد ✅",
			DeleteApprovedSummary:     "درخواست حذف مرخصی **%s** شما توسط کاربر %s تأیید و اعمال شد.",
			DeleteRejectedTitle:       "حذف مرخصی رد شد ❌",
			DeleteRejectedSummary:     "درخواست حذف مرخصی **%s** شما توسط کاربر %s رد شد.",
			DeleteApprovalInstruction: "با تأیید این درخواست، مرخصی حذف می‌شود و از گزارش‌ها و وضعیت حضور خارج می‌شود.",
			UpdatedTitle:              "مرخصی شما ویرایش شد ✅",
			UpdatedSummary:            "مرخصی **%s** شما توسط کاربر %s ویرایش شد.",
			DurationLabel:             "مدت",
			FullDayDuration:           "تمام‌روز",
			HalfDayDuration:           "نیم‌روز",
			HourlyDuration:            "ساعتی",
			MorningPart:               "صبح",
			AfternoonPart:             "بعدازظهر",
			PendingStatus:             "در انتظار",
			ApprovedStatus:            "تاییدشده",
			RejectedStatus:            "ردشده",
			CancelledStatus:           "لغوشده",
		}

	case domain.ReportLanguageArabic:
		return leaveNotificationCopy{
			RequestTitle:              "طلب إجازة 🔥",
			RequestSummary:            "المستخدم %s طلب إجازة **%s**.",
			WorkspaceLabel:            "مساحة العمل",
			DatesLabel:                "التواريخ",
			StatusLabel:               "الحالة",
			ReasonLabel:               "ملاحظات",
			BackupLabel:               "البديل",
			CanContactLabel:           "إمكانية الاتصال عند الحاجة",
			YesLabel:                  "نعم",
			NoLabel:                   "لا",
			RequestSubmittedTitle:     "تم إرسال طلب الإجازة ✅",
			RequestSubmittedSummary:   "تم إرسال طلب إجازة **%s** الخاص بك.",
			OpenCampfireInstruction:   "افتح صفحة مساحة العمل للموافقة على هذا الطلب أو رفضه.",
			DecisionTitle:             "تحديث الإجازة 🔥",
			DecisionSummary:           "تم تحديث طلب إجازة **%s** الخاص بك إلى **%s** بواسطة المستخدم %s.",
			ApprovedTitle:             "تمت الموافقة على إجازتك ✅",
			ApprovedSummary:           "تمت الموافقة على طلب إجازة **%s** الخاص بك بواسطة المستخدم %s",
			RejectedTitle:             "تم رفض إجازتك ❌",
			RejectedSummary:           "تم رفض طلب إجازة **%s** الخاص بك بواسطة المستخدم %s",
			ChannelApprovedTitle:      "إعلان إجازة معتمدة ✅",
			ChannelCancelledTitle:     "إلغاء إجازة معتمدة ↩️",
			ChannelChangedTitle:       "تحديث إجازة معتمدة 🔁",
			ChannelApprovedSummary:    "المستخدم %s سيكون في إجازة **%s** معتمدة.",
			ChannelChangedSummary:     "تم تحديث الإجازة المعتمدة للمستخدم %s من نوع **%s**.",
			ApprovedByLabel:           "تمت الموافقة بواسطة",
			CommentLabel:              "ملاحظة",
			CancelledTitle:            "تم إلغاء الإجازة 🔥",
			CancelledSummary:          "المستخدم %s ألغى طلب إجازة **%s** الذي كان %s.",
			ChannelCancelledSummary:   "المستخدم %s ألغى إجازة **%s** المعتمدة.",
			NoLongerAwayMessage:       "لم يعد هذا المستخدم مسجلاً كغائب خلال هذه الفترة.",
			ChangeRequestTitle:        "طلب تعديل إجازة 🔥",
			ChangeRequestSummary:      "المستخدم %s طلب تعديل إجازة **%s** الخاصة به.",
			ChangeSubmittedTitle:      "تم إرسال طلب تعديل الإجازة ✅",
			ChangeSubmittedSummary:    "تم إرسال طلب تعديل إجازة **%s** الخاص بك وهو بانتظار الموافقة.",
			ChangeDecisionTitle:       "نتيجة طلب تعديل الإجازة 🔥",
			ChangeDecisionSummary:     "تم تحديث طلب تعديل إجازة **%s** الخاص بك إلى **%s** بواسطة المستخدم %s.",
			ChangeApprovedTitle:       "تمت الموافقة على تعديل الإجازة ✅",
			ChangeApprovedSummary:     "تمت الموافقة على طلب تعديل إجازة **%s** الخاص بك وتطبيقه بواسطة المستخدم %s.",
			ChangeRejectedTitle:       "تم رفض تعديل الإجازة ❌",
			ChangeRejectedSummary:     "تم رفض طلب تعديل إجازة **%s** الخاص بك بواسطة المستخدم %s.",
			DeleteRequestTitle:        "طلب حذف إجازة 🔥",
			DeleteRequestSummary:      "المستخدم %s طلب حذف إجازة **%s** الخاصة به.",
			DeleteSubmittedTitle:      "تم إرسال طلب حذف الإجازة ✅",
			DeleteSubmittedSummary:    "تم إرسال طلب حذف إجازة **%s** الخاص بك وهو بانتظار الموافقة.",
			DeleteDecisionTitle:       "نتيجة طلب حذف الإجازة 🔥",
			DeleteDecisionSummary:     "تم تحديث طلب حذف إجازة **%s** الخاص بك إلى **%s** بواسطة المستخدم %s.",
			DeleteApprovedTitle:       "تمت الموافقة على حذف الإجازة ✅",
			DeleteApprovedSummary:     "تمت الموافقة على طلب حذف إجازة **%s** الخاص بك وتطبيقه بواسطة المستخدم %s.",
			DeleteRejectedTitle:       "تم رفض حذف الإجازة ❌",
			DeleteRejectedSummary:     "تم رفض طلب حذف إجازة **%s** الخاص بك بواسطة المستخدم %s.",
			DeleteApprovalInstruction: "عند الموافقة، سيتم حذف الإجازة من التقارير وحالة التوفر.",
			UpdatedTitle:              "تم تعديل إجازتك ✅",
			UpdatedSummary:            "تم تعديل إجازة **%s** الخاصة بك بواسطة المستخدم %s.",
			DurationLabel:             "المدة",
			FullDayDuration:           "يوم كامل",
			HalfDayDuration:           "نصف يوم",
			HourlyDuration:            "بالساعة",
			MorningPart:               "الصباح",
			AfternoonPart:             "بعد الظهر",
			PendingStatus:             "قيد الانتظار",
			ApprovedStatus:            "معتمدة",
			RejectedStatus:            "مرفوضة",
			CancelledStatus:           "ملغاة",
		}

	default:
		return leaveNotificationCopy{
			RequestTitle:              "🔥 **Leave request**",
			RequestSummary:            "%s requested **%s** leave.",
			WorkspaceLabel:            "Workspace",
			DatesLabel:                "Dates",
			StatusLabel:               "Status",
			ReasonLabel:               "Notes",
			BackupLabel:               "Backup",
			CanContactLabel:           "Can be contacted if needed",
			YesLabel:                  "Yes",
			NoLabel:                   "No",
			RequestSubmittedTitle:     "✅ **Leave request submitted**",
			RequestSubmittedSummary:   "Your **%s** leave request was submitted.",
			OpenCampfireInstruction:   "Open the workspace channel to approve or reject this request.",
			DecisionTitle:             "🔥 **Leave update**",
			DecisionSummary:           "Your **%s** leave request was **%s** by %s.",
			ApprovedTitle:             "✅ **Leave approved**",
			ApprovedSummary:           "Your **%s** leave request was **approved** by %s.",
			RejectedTitle:             "❌ **Leave rejected**",
			RejectedSummary:           "Your **%s** leave request was **rejected** by %s.",
			ChannelApprovedTitle:      "✅ **Approved leave**",
			ChannelCancelledTitle:     "↩️ **Approved leave cancelled**",
			ChannelChangedTitle:       "🔁 **Approved leave updated**",
			ChannelApprovedSummary:    "%s will be away on approved **%s** leave.",
			ChannelChangedSummary:     "%s's approved **%s** leave was updated.",
			ApprovedByLabel:           "Approved by",
			CommentLabel:              "Comment",
			CancelledTitle:            "🔥 **Leave cancelled**",
			CancelledSummary:          "%s cancelled their **%s** leave request that was %s.",
			ChannelCancelledSummary:   "%s cancelled their approved **%s** leave.",
			NoLongerAwayMessage:       "They are no longer marked as away for this period.",
			ChangeRequestTitle:        "🔥 **Leave edit requested**",
			ChangeRequestSummary:      "%s requested an edit to their **%s** leave.",
			ChangeSubmittedTitle:      "✅ **Leave edit request submitted**",
			ChangeSubmittedSummary:    "Your edit request for **%s** leave was submitted and is waiting for approval.",
			ChangeDecisionTitle:       "🔥 **Leave edit update**",
			ChangeDecisionSummary:     "Your edit request for **%s** leave was **%s** by %s.",
			ChangeApprovedTitle:       "✅ **Leave edit approved**",
			ChangeApprovedSummary:     "Your edit request for **%s** leave was approved and applied by %s.",
			ChangeRejectedTitle:       "❌ **Leave edit rejected**",
			ChangeRejectedSummary:     "Your edit request for **%s** leave was rejected by %s.",
			DeleteRequestTitle:        "🔥 **Leave deletion requested**",
			DeleteRequestSummary:      "%s requested deletion of their **%s** leave.",
			DeleteSubmittedTitle:      "✅ **Leave deletion request submitted**",
			DeleteSubmittedSummary:    "Your deletion request for **%s** leave was submitted and is waiting for approval.",
			DeleteDecisionTitle:       "🔥 **Leave deletion update**",
			DeleteDecisionSummary:     "Your deletion request for **%s** leave was **%s** by %s.",
			DeleteApprovedTitle:       "✅ **Leave deletion approved**",
			DeleteApprovedSummary:     "Your deletion request for **%s** leave was approved and applied by %s.",
			DeleteRejectedTitle:       "❌ **Leave deletion rejected**",
			DeleteRejectedSummary:     "Your deletion request for **%s** leave was rejected by %s.",
			DeleteApprovalInstruction: "Approving this request deletes the leave from reports and availability state.",
			UpdatedTitle:              "✅ **Leave updated**",
			UpdatedSummary:            "Your **%s** leave was updated by %s.",
			DurationLabel:             "Duration",
			FullDayDuration:           "full day",
			HalfDayDuration:           "half day",
			HourlyDuration:            "hourly",
			MorningPart:               "morning",
			AfternoonPart:             "afternoon",
			PendingStatus:             "pending",
			ApprovedStatus:            "approved",
			RejectedStatus:            "rejected",
			CancelledStatus:           "cancelled",
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
