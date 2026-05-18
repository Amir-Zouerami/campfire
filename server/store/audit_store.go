package store

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/jmoiron/sqlx"
)

/*
CreateAuditLogEntryParams contains one audit row to insert.
*/
type CreateAuditLogEntryParams struct {
	ID           domain.ID
	WorkspaceID  domain.ID
	ActorUserID  string
	Action       string
	EntityType   string
	EntityID     string
	MetadataJSON string
	CreatedAt    time.Time
}

/*
AuditStore defines audit-log persistence operations.
*/
type AuditStore interface {
	Create(ctx context.Context, params CreateAuditLogEntryParams) (*domain.AuditLogEntry, error)
	ListByWorkspaceID(ctx context.Context, workspaceID domain.ID, limit int) ([]domain.AuditLogEntry, error)
}

/*
SQLAuditStore persists audit-log rows in SQL.
*/
type SQLAuditStore struct {
	db *sqlx.DB
}

/*
NewSQLAuditStore creates a SQL-backed audit store.
*/
func NewSQLAuditStore(database *Database) *SQLAuditStore {
	return &SQLAuditStore{
		db: database.DB,
	}
}

/*
Create inserts one audit-log entry.
*/
func (s *SQLAuditStore) Create(
	ctx context.Context,
	params CreateAuditLogEntryParams,
) (*domain.AuditLogEntry, error) {
	record := auditLogEntryRecord{
		ID:           params.ID.String(),
		WorkspaceID:  params.WorkspaceID.String(),
		ActorUserID:  params.ActorUserID,
		Action:       params.Action,
		EntityType:   params.EntityType,
		EntityID:     params.EntityID,
		MetadataJSON: params.MetadataJSON,
		CreatedAt:    params.CreatedAt,
	}

	query := s.db.Rebind(`
		INSERT INTO campfire_audit_log (
			id,
			workspace_id,
			actor_user_id,
			action,
			entity_type,
			entity_id,
			metadata_json,
			created_at
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`)

	if _, err := s.db.ExecContext(
		ctx,
		query,
		record.ID,
		record.WorkspaceID,
		record.ActorUserID,
		record.Action,
		record.EntityType,
		record.EntityID,
		record.MetadataJSON,
		record.CreatedAt,
	); err != nil {
		return nil, fmt.Errorf("create audit log entry: %w", err)
	}

	entry := record.toDomain()

	return &entry, nil
}

/*
ListByWorkspaceID returns recent audit-log entries for a workspace.
*/
func (s *SQLAuditStore) ListByWorkspaceID(
	ctx context.Context,
	workspaceID domain.ID,
	limit int,
) ([]domain.AuditLogEntry, error) {
	if limit <= 0 {
		limit = 50
	}

	if limit > 200 {
		limit = 200
	}

	query := s.db.Rebind(`
		SELECT
			id,
			workspace_id,
			actor_user_id,
			action,
			entity_type,
			entity_id,
			metadata_json,
			created_at
		FROM campfire_audit_log
		WHERE workspace_id = ?
		ORDER BY created_at DESC
		LIMIT ?
	`)

	records := []auditLogEntryRecord{}
	if err := s.db.SelectContext(ctx, &records, query, workspaceID.String(), limit); err != nil {
		if err == sql.ErrNoRows {
			return []domain.AuditLogEntry{}, nil
		}

		return nil, fmt.Errorf("list audit log entries: %w", err)
	}

	entries := make([]domain.AuditLogEntry, 0, len(records))
	for _, record := range records {
		entries = append(entries, record.toDomain())
	}

	return entries, nil
}

/*
auditLogEntryRecord is the SQL shape of one audit-log row.
*/
type auditLogEntryRecord struct {
	ID           string    `db:"id"`
	WorkspaceID  string    `db:"workspace_id"`
	ActorUserID  string    `db:"actor_user_id"`
	Action       string    `db:"action"`
	EntityType   string    `db:"entity_type"`
	EntityID     string    `db:"entity_id"`
	MetadataJSON string    `db:"metadata_json"`
	CreatedAt    time.Time `db:"created_at"`
}

/*
toDomain maps an audit-log record to the domain model.
*/
func (r auditLogEntryRecord) toDomain() domain.AuditLogEntry {
	return domain.AuditLogEntry{
		ID:           domain.ID(r.ID),
		WorkspaceID:  domain.ID(r.WorkspaceID),
		ActorUserID:  r.ActorUserID,
		Action:       r.Action,
		EntityType:   r.EntityType,
		EntityID:     r.EntityID,
		MetadataJSON: r.MetadataJSON,
		CreatedAt:    parseStoredTime(r.CreatedAt),
	}
}
