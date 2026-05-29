package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/jmoiron/sqlx"
)

/*
ReportStore defines persistence operations for report rules and report runs.
*/
type ReportStore interface {
	ListRulesByWorkspaceID(ctx context.Context, workspaceID domain.ID) ([]domain.ReportRule, error)
	UpdateRule(ctx context.Context, rule domain.ReportRule) (*domain.ReportRule, error)
	GetEnabledRuleByWorkspaceIDAndKind(
		ctx context.Context,
		workspaceID domain.ID,
		reportKind domain.ReportKind,
	) (*domain.ReportRule, error)
	GetRunByRuleAndPeriod(
		ctx context.Context,
		workspaceID domain.ID,
		reportRuleID domain.ID,
		reportKind domain.ReportKind,
		periodStart domain.LocalDate,
		periodEnd domain.LocalDate,
	) (*domain.ReportRun, error)
	ListRunsByWorkspaceIDAndKind(
		ctx context.Context,
		workspaceID domain.ID,
		reportKind domain.ReportKind,
		limit int,
	) ([]domain.ReportRun, error)
	CreateRun(ctx context.Context, run domain.ReportRun) (*domain.ReportRun, error)
	PrepareRunForRepost(
		ctx context.Context,
		runID domain.ID,
		postedBy string,
		markdown string,
		generatedAt time.Time,
	) (*domain.ReportRun, error)
	MarkRunPosted(ctx context.Context, runID domain.ID, mattermostPostID string, postedAt time.Time) (*domain.ReportRun, error)
	MarkRunFailed(ctx context.Context, runID domain.ID, updatedAt time.Time) error
}

/*
SQLReportStore persists report data in SQL.
*/
type SQLReportStore struct {
	db *sqlx.DB
}

/*
NewSQLReportStore creates a SQL-backed report store.
*/
func NewSQLReportStore(database *Database) *SQLReportStore {
	return &SQLReportStore{
		db: database.DB,
	}
}

/*
ListRulesByWorkspaceID returns report rules for one workspace.
*/
func (s *SQLReportStore) ListRulesByWorkspaceID(
	ctx context.Context,
	workspaceID domain.ID,
) ([]domain.ReportRule, error) {
	records := []reportRuleRecord{}

	err := s.db.SelectContext(
		ctx,
		&records,
		s.db.Rebind(`
			SELECT
				id,
				workspace_id,
				schedule_id,
				enabled,
				report_kind,
				post_to_channel,
				preview_required,
				sort_mode,
				report_language,
				include_on_leave,
				include_missing,
				include_time,
				include_blockers,
				created_by,
				created_at,
				updated_at
			FROM campfire_report_rules
			WHERE workspace_id = ?
			ORDER BY report_kind ASC, created_at ASC
		`),
		workspaceID.String(),
	)
	if err != nil {
		return nil, fmt.Errorf("list report rules by workspace: %w", err)
	}

	rules := make([]domain.ReportRule, 0, len(records))
	for _, record := range records {
		rules = append(rules, record.toDomain())
	}

	return rules, nil
}

/*
UpdateRule updates mutable report-rule settings.
*/
func (s *SQLReportStore) UpdateRule(ctx context.Context, rule domain.ReportRule) (*domain.ReportRule, error) {
	result, err := s.db.ExecContext(
		ctx,
		s.db.Rebind(`
			UPDATE campfire_report_rules
			SET
				enabled = ?,
				post_to_channel = ?,
				preview_required = ?,
				sort_mode = ?,
				report_language = ?,
				include_on_leave = ?,
				include_missing = ?,
				include_time = ?,
				include_blockers = ?,
				updated_at = ?
			WHERE id = ? AND workspace_id = ?
		`),
		rule.Enabled,
		rule.PostToChannel,
		rule.PreviewRequired,
		string(rule.SortMode),
		string(rule.ReportLanguage),
		rule.IncludeOnLeave,
		rule.IncludeMissing,
		rule.IncludeTime,
		rule.IncludeBlockers,
		rule.UpdatedAt,
		rule.ID.String(),
		rule.WorkspaceID.String(),
	)
	if err != nil {
		return nil, fmt.Errorf("update report rule: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return nil, fmt.Errorf("read report rule update result: %w", err)
	}

	if rowsAffected == 0 {
		return nil, ErrNotFound
	}

	updated, err := s.getRuleByID(ctx, rule.WorkspaceID, rule.ID)
	if err != nil {
		return nil, err
	}

	return updated, nil
}

/*
getRuleByID returns one report rule by workspace and ID.
*/
func (s *SQLReportStore) getRuleByID(
	ctx context.Context,
	workspaceID domain.ID,
	reportRuleID domain.ID,
) (*domain.ReportRule, error) {
	var record reportRuleRecord

	err := s.db.GetContext(
		ctx,
		&record,
		s.db.Rebind(`
			SELECT
				id,
				workspace_id,
				schedule_id,
				enabled,
				report_kind,
				post_to_channel,
				preview_required,
				sort_mode,
				report_language,
				include_on_leave,
				include_missing,
				include_time,
				include_blockers,
				created_by,
				created_at,
				updated_at
			FROM campfire_report_rules
			WHERE workspace_id = ? AND id = ?
			LIMIT 1
		`),
		workspaceID.String(),
		reportRuleID.String(),
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}

		return nil, fmt.Errorf("get report rule by id: %w", err)
	}

	rule := record.toDomain()

	return &rule, nil
}

/*
GetEnabledRuleByWorkspaceIDAndKind returns the enabled report rule for a workspace/kind.
*/
func (s *SQLReportStore) GetEnabledRuleByWorkspaceIDAndKind(
	ctx context.Context,
	workspaceID domain.ID,
	reportKind domain.ReportKind,
) (*domain.ReportRule, error) {
	var record reportRuleRecord

	err := s.db.GetContext(
		ctx,
		&record,
		s.db.Rebind(`
			SELECT
				id,
				workspace_id,
				schedule_id,
				enabled,
				report_kind,
				post_to_channel,
				preview_required,
				sort_mode,
				report_language,
				include_on_leave,
				include_missing,
				include_time,
				include_blockers,
				created_by,
				created_at,
				updated_at
			FROM campfire_report_rules
			WHERE workspace_id = ?
				AND report_kind = ?
				AND enabled = TRUE
			ORDER BY created_at ASC
			LIMIT 1
		`),
		workspaceID.String(),
		string(reportKind),
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}

		return nil, fmt.Errorf("get enabled report rule: %w", err)
	}

	rule := record.toDomain()

	return &rule, nil
}

/*
GetRunByRuleAndPeriod returns an existing report run for a unique report period.
*/
func (s *SQLReportStore) GetRunByRuleAndPeriod(
	ctx context.Context,
	workspaceID domain.ID,
	reportRuleID domain.ID,
	reportKind domain.ReportKind,
	periodStart domain.LocalDate,
	periodEnd domain.LocalDate,
) (*domain.ReportRun, error) {
	var record reportRunRecord

	err := s.db.GetContext(
		ctx,
		&record,
		s.db.Rebind(`
			SELECT
				id,
				workspace_id,
				report_rule_id,
				schedule_id,
				report_kind,
				period_start,
				period_end,
				generated_at,
				posted_at,
				posted_by,
				mattermost_post_id,
				markdown,
				status,
				created_at,
				updated_at
			FROM campfire_report_runs
			WHERE workspace_id = ?
				AND report_rule_id = ?
				AND report_kind = ?
				AND period_start = ?
				AND period_end = ?
			LIMIT 1
		`),
		workspaceID.String(),
		reportRuleID.String(),
		string(reportKind),
		periodStart.String(),
		periodEnd.String(),
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}

		return nil, fmt.Errorf("get report run by period: %w", err)
	}

	run := record.toDomain()

	return &run, nil
}

/*
ListRunsByWorkspaceIDAndKind returns recent report runs for a workspace/kind.
*/
func (s *SQLReportStore) ListRunsByWorkspaceIDAndKind(
	ctx context.Context,
	workspaceID domain.ID,
	reportKind domain.ReportKind,
	limit int,
) ([]domain.ReportRun, error) {
	safeLimit := limit
	if safeLimit <= 0 || safeLimit > 100 {
		safeLimit = 20
	}

	records := []reportRunRecord{}

	err := s.db.SelectContext(
		ctx,
		&records,
		s.db.Rebind(`
			SELECT
				id,
				workspace_id,
				report_rule_id,
				schedule_id,
				report_kind,
				period_start,
				period_end,
				generated_at,
				posted_at,
				posted_by,
				mattermost_post_id,
				markdown,
				status,
				created_at,
				updated_at
			FROM campfire_report_runs
			WHERE workspace_id = ?
				AND report_kind = ?
			ORDER BY generated_at DESC, created_at DESC
			LIMIT ?
		`),
		workspaceID.String(),
		string(reportKind),
		safeLimit,
	)
	if err != nil {
		return nil, fmt.Errorf("list report runs: %w", err)
	}

	runs := make([]domain.ReportRun, 0, len(records))
	for _, record := range records {
		runs = append(runs, record.toDomain())
	}

	return runs, nil
}

/*
CreateRun inserts a new report run reservation.
*/
func (s *SQLReportStore) CreateRun(
	ctx context.Context,
	run domain.ReportRun,
) (*domain.ReportRun, error) {
	_, err := s.db.ExecContext(
		ctx,
		s.db.Rebind(`
			INSERT INTO campfire_report_runs (
				id,
				workspace_id,
				report_rule_id,
				schedule_id,
				report_kind,
				period_start,
				period_end,
				generated_at,
				posted_at,
				posted_by,
				mattermost_post_id,
				markdown,
				status,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`),
		run.ID.String(),
		run.WorkspaceID.String(),
		run.ReportRuleID.String(),
		run.ScheduleID.String(),
		string(run.ReportKind),
		run.PeriodStart.String(),
		run.PeriodEnd.String(),
		run.GeneratedAt,
		run.PostedAt,
		run.PostedBy,
		run.MattermostPostID,
		run.Markdown,
		string(run.Status),
		run.CreatedAt,
		run.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("create report run: %w", err)
	}

	return &run, nil
}

/*
PrepareRunForRepost reuses an existing manual report-run reservation.

Campfire keeps one history row per report rule and period today because the
original database migration created a uniqueness constraint for scheduler
idempotency. Manual reposts must still be allowed, so the existing row is
reserved again and then marked posted with the new Mattermost post ID.
*/
func (s *SQLReportStore) PrepareRunForRepost(
	ctx context.Context,
	runID domain.ID,
	postedBy string,
	markdown string,
	generatedAt time.Time,
) (*domain.ReportRun, error) {
	result, err := s.db.ExecContext(
		ctx,
		s.db.Rebind(`
			UPDATE campfire_report_runs
			SET
				generated_at = ?,
				posted_at = NULL,
				posted_by = ?,
				mattermost_post_id = '',
				markdown = ?,
				status = ?,
				updated_at = ?
			WHERE id = ?
		`),
		generatedAt,
		postedBy,
		markdown,
		string(domain.ReportRunStatusPosting),
		generatedAt,
		runID.String(),
	)
	if err != nil {
		return nil, fmt.Errorf("prepare report run for repost: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return nil, fmt.Errorf("read report repost result: %w", err)
	}

	if rowsAffected == 0 {
		return nil, ErrNotFound
	}

	return s.getRunByID(ctx, runID)
}

/*
MarkRunPosted updates a report run after a Mattermost post succeeds.
*/
func (s *SQLReportStore) MarkRunPosted(
	ctx context.Context,
	runID domain.ID,
	mattermostPostID string,
	postedAt time.Time,
) (*domain.ReportRun, error) {
	_, err := s.db.ExecContext(
		ctx,
		s.db.Rebind(`
			UPDATE campfire_report_runs
			SET
				posted_at = ?,
				mattermost_post_id = ?,
				status = ?,
				updated_at = ?
			WHERE id = ?
		`),
		postedAt,
		mattermostPostID,
		string(domain.ReportRunStatusPosted),
		postedAt,
		runID.String(),
	)
	if err != nil {
		return nil, fmt.Errorf("mark report run posted: %w", err)
	}

	return s.getRunByID(ctx, runID)
}

/*
MarkRunFailed updates a report run after posting fails.
*/
func (s *SQLReportStore) MarkRunFailed(
	ctx context.Context,
	runID domain.ID,
	updatedAt time.Time,
) error {
	_, err := s.db.ExecContext(
		ctx,
		s.db.Rebind(`
			UPDATE campfire_report_runs
			SET status = ?, updated_at = ?
			WHERE id = ?
		`),
		string(domain.ReportRunStatusFailed),
		updatedAt,
		runID.String(),
	)
	if err != nil {
		return fmt.Errorf("mark report run failed: %w", err)
	}

	return nil
}

/*
getRunByID returns a report run by ID.
*/
func (s *SQLReportStore) getRunByID(ctx context.Context, runID domain.ID) (*domain.ReportRun, error) {
	var record reportRunRecord

	err := s.db.GetContext(
		ctx,
		&record,
		s.db.Rebind(`
			SELECT
				id,
				workspace_id,
				report_rule_id,
				schedule_id,
				report_kind,
				period_start,
				period_end,
				generated_at,
				posted_at,
				posted_by,
				mattermost_post_id,
				markdown,
				status,
				created_at,
				updated_at
			FROM campfire_report_runs
			WHERE id = ?
			LIMIT 1
		`),
		runID.String(),
	)
	if err != nil {
		return nil, fmt.Errorf("get report run by id: %w", err)
	}

	run := record.toDomain()

	return &run, nil
}

/*
reportRuleRecord represents a row from campfire_report_rules.
*/
type reportRuleRecord struct {
	ID              string    `db:"id"`
	WorkspaceID     string    `db:"workspace_id"`
	ScheduleID      string    `db:"schedule_id"`
	Enabled         bool      `db:"enabled"`
	ReportKind      string    `db:"report_kind"`
	PostToChannel   bool      `db:"post_to_channel"`
	PreviewRequired bool      `db:"preview_required"`
	SortMode        string    `db:"sort_mode"`
	ReportLanguage  string    `db:"report_language"`
	IncludeOnLeave  bool      `db:"include_on_leave"`
	IncludeMissing  bool      `db:"include_missing"`
	IncludeTime     bool      `db:"include_time"`
	IncludeBlockers bool      `db:"include_blockers"`
	CreatedBy       string    `db:"created_by"`
	CreatedAt       time.Time `db:"created_at"`
	UpdatedAt       time.Time `db:"updated_at"`
}

/*
toDomain maps a report rule record to the domain model.
*/
func (r reportRuleRecord) toDomain() domain.ReportRule {
	return domain.ReportRule{
		ID:              domain.ID(r.ID),
		WorkspaceID:     domain.ID(r.WorkspaceID),
		ScheduleID:      domain.ID(r.ScheduleID),
		Enabled:         r.Enabled,
		ReportKind:      domain.ReportKind(r.ReportKind),
		PostToChannel:   r.PostToChannel,
		PreviewRequired: r.PreviewRequired,
		SortMode:        domain.ReportSortMode(r.SortMode),
		ReportLanguage:  domain.ReportLanguage(r.ReportLanguage),
		IncludeOnLeave:  r.IncludeOnLeave,
		IncludeMissing:  r.IncludeMissing,
		IncludeTime:     r.IncludeTime,
		IncludeBlockers: r.IncludeBlockers,
		CreatedBy:       r.CreatedBy,
		CreatedAt:       parseStoredTime(r.CreatedAt),
		UpdatedAt:       parseStoredTime(r.UpdatedAt),
	}
}

/*
reportRunRecord represents a row from campfire_report_runs.
*/
type reportRunRecord struct {
	ID               string       `db:"id"`
	WorkspaceID      string       `db:"workspace_id"`
	ReportRuleID     string       `db:"report_rule_id"`
	ScheduleID       string       `db:"schedule_id"`
	ReportKind       string       `db:"report_kind"`
	PeriodStart      string       `db:"period_start"`
	PeriodEnd        string       `db:"period_end"`
	GeneratedAt      time.Time    `db:"generated_at"`
	PostedAt         sql.NullTime `db:"posted_at"`
	PostedBy         string       `db:"posted_by"`
	MattermostPostID string       `db:"mattermost_post_id"`
	Markdown         string       `db:"markdown"`
	Status           string       `db:"status"`
	CreatedAt        time.Time    `db:"created_at"`
	UpdatedAt        time.Time    `db:"updated_at"`
}

/*
toDomain maps a report run record to the domain model.
*/
func (r reportRunRecord) toDomain() domain.ReportRun {
	return domain.ReportRun{
		ID:               domain.ID(r.ID),
		WorkspaceID:      domain.ID(r.WorkspaceID),
		ReportRuleID:     domain.ID(r.ReportRuleID),
		ScheduleID:       domain.ID(r.ScheduleID),
		ReportKind:       domain.ReportKind(r.ReportKind),
		PeriodStart:      domain.LocalDate(r.PeriodStart),
		PeriodEnd:        domain.LocalDate(r.PeriodEnd),
		GeneratedAt:      parseStoredTime(r.GeneratedAt),
		PostedAt:         nullTimeToPointer(r.PostedAt),
		PostedBy:         r.PostedBy,
		MattermostPostID: r.MattermostPostID,
		Markdown:         r.Markdown,
		Status:           domain.ReportRunStatus(r.Status),
		CreatedAt:        parseStoredTime(r.CreatedAt),
		UpdatedAt:        parseStoredTime(r.UpdatedAt),
	}
}
