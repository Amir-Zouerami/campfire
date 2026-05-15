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
ReminderStore defines reminder-rule persistence operations.
*/
type ReminderStore interface {
	ListByWorkspaceID(ctx context.Context, workspaceID domain.ID) ([]domain.ReminderRule, error)
	Update(ctx context.Context, rule domain.ReminderRule) (*domain.ReminderRule, error)
}

/*
SQLReminderStore persists reminder rules in SQL.
*/
type SQLReminderStore struct {
	db *sqlx.DB
}

/*
NewSQLReminderStore creates a SQL-backed reminder store.
*/
func NewSQLReminderStore(database *Database) *SQLReminderStore {
	return &SQLReminderStore{
		db: database.DB,
	}
}

/*
ListByWorkspaceID returns reminder rules for one workspace.
*/
func (s *SQLReminderStore) ListByWorkspaceID(
	ctx context.Context,
	workspaceID domain.ID,
) ([]domain.ReminderRule, error) {
	records := []reminderRuleRecord{}

	err := s.db.SelectContext(
		ctx,
		&records,
		s.db.Rebind(`
			SELECT
				id,
				workspace_id,
				schedule_id,
				enabled,
				channel_reminder_enabled,
				dm_reminder_enabled,
				reminder_offsets_json,
				mention_missing_in_channel,
				created_by,
				created_at,
				updated_at
			FROM campfire_reminder_rules
			WHERE workspace_id = ?
			ORDER BY created_at ASC
		`),
		workspaceID.String(),
	)
	if err != nil {
		return nil, fmt.Errorf("list reminder rules by workspace: %w", err)
	}

	rules := make([]domain.ReminderRule, 0, len(records))
	for _, record := range records {
		rules = append(rules, record.toDomain())
	}

	return rules, nil
}

/*
Update replaces mutable fields on an existing reminder rule.
*/
func (s *SQLReminderStore) Update(
	ctx context.Context,
	rule domain.ReminderRule,
) (*domain.ReminderRule, error) {
	result, err := s.db.ExecContext(
		ctx,
		s.db.Rebind(`
			UPDATE campfire_reminder_rules
			SET
				enabled = ?,
				channel_reminder_enabled = ?,
				dm_reminder_enabled = ?,
				reminder_offsets_json = ?,
				mention_missing_in_channel = ?,
				updated_at = ?
			WHERE id = ? AND workspace_id = ?
		`),
		rule.Enabled,
		rule.ChannelReminderEnabled,
		rule.DMReminderEnabled,
		rule.ReminderOffsetsJSON,
		rule.MentionMissingInChannel,
		rule.UpdatedAt,
		rule.ID.String(),
		rule.WorkspaceID.String(),
	)
	if err != nil {
		return nil, fmt.Errorf("update reminder rule: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return nil, fmt.Errorf("read reminder rule update result: %w", err)
	}

	if rowsAffected == 0 {
		return nil, ErrNotFound
	}

	updated, err := s.getByID(ctx, rule.WorkspaceID, rule.ID)
	if err != nil {
		return nil, err
	}

	return updated, nil
}

/*
getByID returns one reminder rule by workspace and ID.
*/
func (s *SQLReminderStore) getByID(
	ctx context.Context,
	workspaceID domain.ID,
	ruleID domain.ID,
) (*domain.ReminderRule, error) {
	var record reminderRuleRecord

	err := s.db.GetContext(
		ctx,
		&record,
		s.db.Rebind(`
			SELECT
				id,
				workspace_id,
				schedule_id,
				enabled,
				channel_reminder_enabled,
				dm_reminder_enabled,
				reminder_offsets_json,
				mention_missing_in_channel,
				created_by,
				created_at,
				updated_at
			FROM campfire_reminder_rules
			WHERE workspace_id = ? AND id = ?
			LIMIT 1
		`),
		workspaceID.String(),
		ruleID.String(),
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}

		return nil, fmt.Errorf("get reminder rule by id: %w", err)
	}

	rule := record.toDomain()

	return &rule, nil
}

/*
reminderRuleRecord represents one row from campfire_reminder_rules.
*/
type reminderRuleRecord struct {
	ID                      string    `db:"id"`
	WorkspaceID             string    `db:"workspace_id"`
	ScheduleID              string    `db:"schedule_id"`
	Enabled                 bool      `db:"enabled"`
	ChannelReminderEnabled  bool      `db:"channel_reminder_enabled"`
	DMReminderEnabled       bool      `db:"dm_reminder_enabled"`
	ReminderOffsetsJSON     string    `db:"reminder_offsets_json"`
	MentionMissingInChannel bool      `db:"mention_missing_in_channel"`
	CreatedBy               string    `db:"created_by"`
	CreatedAt               time.Time `db:"created_at"`
	UpdatedAt               time.Time `db:"updated_at"`
}

/*
toDomain maps a reminder-rule record to the domain model.
*/
func (r reminderRuleRecord) toDomain() domain.ReminderRule {
	return domain.ReminderRule{
		ID:                      domain.ID(r.ID),
		WorkspaceID:             domain.ID(r.WorkspaceID),
		ScheduleID:              domain.ID(r.ScheduleID),
		Enabled:                 r.Enabled,
		ChannelReminderEnabled:  r.ChannelReminderEnabled,
		DMReminderEnabled:       r.DMReminderEnabled,
		ReminderOffsetsJSON:     r.ReminderOffsetsJSON,
		MentionMissingInChannel: r.MentionMissingInChannel,
		CreatedBy:               r.CreatedBy,
		CreatedAt:               parseStoredTime(r.CreatedAt),
		UpdatedAt:               parseStoredTime(r.UpdatedAt),
	}
}
