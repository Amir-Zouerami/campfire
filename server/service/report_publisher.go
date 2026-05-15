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
WeeklyReportPost contains data needed to post a generated weekly report.
*/
type WeeklyReportPost struct {
	WorkspaceID    string
	WorkspaceName  string
	ChannelID      string
	PeriodStart    string
	PeriodEnd      string
	Markdown       string
	PostedByUserID string
}

/*
ReportPublisher defines outbound report publishing behavior.

Application services depend on this port instead of importing Mattermost APIs.
*/
type ReportPublisher interface {
	PostDailyReport(ctx context.Context, post DailyReportPost) (string, error)
	PostWeeklyReport(ctx context.Context, post WeeklyReportPost) (string, error)
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
PostDailyReport intentionally does nothing and returns an empty post ID.
*/
func (p *NoopReportPublisher) PostDailyReport(_ context.Context, _ DailyReportPost) (string, error) {
	return "", nil
}

/*
PostWeeklyReport intentionally does nothing and returns an empty post ID.
*/
func (p *NoopReportPublisher) PostWeeklyReport(_ context.Context, _ WeeklyReportPost) (string, error) {
	return "", nil
}
