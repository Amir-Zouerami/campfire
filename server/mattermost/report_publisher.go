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
ReportPublisher posts Campfire reports through Mattermost.
*/
type ReportPublisher struct {
	api       plugin.API
	botUserID string
}

/*
NewReportPublisher creates a Mattermost-backed report publisher.
*/
func NewReportPublisher(api plugin.API, botUserID string) *ReportPublisher {
	return &ReportPublisher{
		api:       api,
		botUserID: botUserID,
	}
}

/*
PostWeeklyReport posts a generated weekly report to the workspace channel.
*/
func (p *ReportPublisher) PostWeeklyReport(
	ctx context.Context,
	post service.WeeklyReportPost,
) (string, error) {
	select {
	case <-ctx.Done():
		return "", ctx.Err()
	default:
	}

	if strings.TrimSpace(p.botUserID) == "" {
		return "", fmt.Errorf("Campfire bot user ID is empty")
	}

	cleanChannelID := strings.TrimSpace(post.ChannelID)
	if cleanChannelID == "" {
		return "", fmt.Errorf("Campfire report channel ID is empty")
	}

	message := strings.TrimSpace(post.Markdown)
	if message == "" {
		return "", fmt.Errorf("Campfire weekly report Markdown is empty")
	}

	createdPost, appErr := p.api.CreatePost(&model.Post{
		UserId:    p.botUserID,
		ChannelId: cleanChannelID,
		Message:   message,
	})
	if appErr != nil {
		return "", appErr
	}

	if createdPost == nil {
		return "", fmt.Errorf("Mattermost returned an empty post")
	}

	return createdPost.Id, nil
}

/*
PostDailyReport posts a generated daily report to the workspace channel.
*/
func (p *ReportPublisher) PostDailyReport(
	ctx context.Context,
	post service.DailyReportPost,
) (string, error) {
	select {
	case <-ctx.Done():
		return "", ctx.Err()
	default:
	}

	if strings.TrimSpace(p.botUserID) == "" {
		return "", fmt.Errorf("Campfire bot user ID is empty")
	}

	cleanChannelID := strings.TrimSpace(post.ChannelID)
	if cleanChannelID == "" {
		return "", fmt.Errorf("Campfire report channel ID is empty")
	}

	message := strings.TrimSpace(post.Markdown)
	if message == "" {
		return "", fmt.Errorf("Campfire daily report Markdown is empty")
	}

	createdPost, appErr := p.api.CreatePost(&model.Post{
		UserId:    p.botUserID,
		ChannelId: cleanChannelID,
		Message:   message,
	})
	if appErr != nil {
		return "", appErr
	}

	if createdPost == nil {
		return "", fmt.Errorf("Mattermost returned an empty post")
	}

	return createdPost.Id, nil
}
