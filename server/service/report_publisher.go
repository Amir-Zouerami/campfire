package service

import "context"

/*
DailyReportPost contains data needed to post a generated daily report.
*/
type DailyReportPost struct {
	WorkspaceID    string
	WorkspaceName  string
	ChannelID      string
	OccurrenceDate string
	Markdown       string
	PostedByUserID string
}

/*
ReportPublisher defines outbound report publishing behavior.

Application services depend on this port instead of importing Mattermost APIs.
*/
type ReportPublisher interface {
	PostDailyReport(ctx context.Context, post DailyReportPost) error
}

/*
NoopReportPublisher intentionally drops report posts.

It is useful for tests and non-Mattermost service execution.
*/
type NoopReportPublisher struct{}

/*
NewNoopReportPublisher creates a report publisher that does nothing.
*/
func NewNoopReportPublisher() *NoopReportPublisher {
	return &NoopReportPublisher{}
}

/*
PostDailyReport intentionally does nothing.
*/
func (p *NoopReportPublisher) PostDailyReport(_ context.Context, _ DailyReportPost) error {
	return nil
}
