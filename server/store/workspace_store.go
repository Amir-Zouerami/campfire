package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/jmoiron/sqlx"
)

/*
CreateWorkspaceParams contains all records needed to create a workspace.

Workspace creation is intentionally transactional at the store layer.
*/
type CreateWorkspaceParams struct {
	Workspace       domain.Workspace
	WorkingDays     []domain.WorkspaceWorkingDay
	RoleSettings    domain.WorkspaceRoleSettings
	RoleAssignments []domain.WorkspaceRoleAssignment
}

/*
WorkspaceStore defines persistence operations for workspace configuration.
*/
type WorkspaceStore interface {
	GetByChannelID(ctx context.Context, channelID string) (*domain.Workspace, error)
	Create(ctx context.Context, params CreateWorkspaceParams) (*domain.Workspace, error)
}

/*
SQLWorkspaceStore persists workspace configuration in SQL.
*/
type SQLWorkspaceStore struct {
	db *sqlx.DB
}

/*
NewSQLWorkspaceStore creates a SQL-backed workspace store.
*/
func NewSQLWorkspaceStore(database *Database) *SQLWorkspaceStore {
	return &SQLWorkspaceStore{
		db: database.DB,
	}
}

/*
GetByChannelID returns the active Campfire workspace linked to a Mattermost channel.
*/
func (s *SQLWorkspaceStore) GetByChannelID(ctx context.Context, channelID string) (*domain.Workspace, error) {
	var record workspaceRecord

	err := s.db.GetContext(
		ctx,
		&record,
		`
		SELECT
			id,
			team_id,
			channel_id,
			name,
			description,
			board_url,
			timezone,
			created_by,
			created_at,
			updated_at,
			is_archived
		FROM campfire_workspaces
		WHERE channel_id = ? AND is_archived = FALSE
		LIMIT 1
		`,
		channelID,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}

		return nil, fmt.Errorf("get workspace by channel id: %w", err)
	}

	workspace := record.toDomain()

	return &workspace, nil
}

/*
Create inserts a workspace and its initial configuration in a single transaction.
*/
func (s *SQLWorkspaceStore) Create(ctx context.Context, params CreateWorkspaceParams) (*domain.Workspace, error) {
	transaction, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin workspace transaction: %w", err)
	}

	committed := false

	defer func() {
		if !committed {
			rollbackErr := transaction.Rollback()
			if rollbackErr != nil && !errors.Is(rollbackErr, sql.ErrTxDone) {
				return
			}
		}
	}()

	if err := insertWorkspace(ctx, transaction, params.Workspace); err != nil {
		return nil, err
	}

	for _, workingDay := range params.WorkingDays {
		if err := insertWorkingDay(ctx, transaction, workingDay); err != nil {
			return nil, err
		}
	}

	if err := insertRoleSettings(ctx, transaction, params.RoleSettings); err != nil {
		return nil, err
	}

	for _, roleAssignment := range params.RoleAssignments {
		if err := insertRoleAssignment(ctx, transaction, roleAssignment); err != nil {
			return nil, err
		}
	}

	if err := transaction.Commit(); err != nil {
		return nil, fmt.Errorf("commit workspace transaction: %w", err)
	}

	committed = true

	return &params.Workspace, nil
}

/*
insertWorkspace inserts a workspace row.
*/
func insertWorkspace(ctx context.Context, tx *sqlx.Tx, workspace domain.Workspace) error {
	_, err := tx.ExecContext(
		ctx,
		`
		INSERT INTO campfire_workspaces (
			id,
			team_id,
			channel_id,
			name,
			description,
			board_url,
			timezone,
			created_by,
			created_at,
			updated_at,
			is_archived
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
		workspace.ID.String(),
		workspace.TeamID,
		workspace.ChannelID,
		workspace.Name,
		workspace.Description,
		workspace.BoardURL,
		workspace.Timezone,
		workspace.CreatedBy,
		workspace.CreatedAt,
		workspace.UpdatedAt,
		workspace.IsArchived,
	)
	if err != nil {
		return fmt.Errorf("insert workspace: %w", err)
	}

	return nil
}

/*
insertWorkingDay inserts a workspace working-day row.
*/
func insertWorkingDay(ctx context.Context, tx *sqlx.Tx, workingDay domain.WorkspaceWorkingDay) error {
	_, err := tx.ExecContext(
		ctx,
		`
		INSERT INTO campfire_workspace_working_days (
			id,
			workspace_id,
			weekday,
			enabled,
			created_at,
			updated_at
		) VALUES (?, ?, ?, ?, ?, ?)
		`,
		workingDay.ID.String(),
		workingDay.WorkspaceID.String(),
		int(workingDay.Weekday),
		workingDay.Enabled,
		workingDay.CreatedAt,
		workingDay.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert workspace working day: %w", err)
	}

	return nil
}

/*
insertRoleSettings inserts workspace role settings.
*/
func insertRoleSettings(ctx context.Context, tx *sqlx.Tx, roleSettings domain.WorkspaceRoleSettings) error {
	_, err := tx.ExecContext(
		ctx,
		`
		INSERT INTO campfire_workspace_role_settings (
			workspace_id,
			channel_admins_are_leads,
			system_admins_are_admins,
			created_at,
			updated_at
		) VALUES (?, ?, ?, ?, ?)
		`,
		roleSettings.WorkspaceID.String(),
		roleSettings.ChannelAdminsAreLeads,
		roleSettings.SystemAdminsAreAdmins,
		roleSettings.CreatedAt,
		roleSettings.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert workspace role settings: %w", err)
	}

	return nil
}

/*
insertRoleAssignment inserts a workspace role assignment.
*/
func insertRoleAssignment(ctx context.Context, tx *sqlx.Tx, roleAssignment domain.WorkspaceRoleAssignment) error {
	_, err := tx.ExecContext(
		ctx,
		`
		INSERT INTO campfire_workspace_role_assignments (
			id,
			workspace_id,
			user_id,
			role,
			created_by,
			created_at
		) VALUES (?, ?, ?, ?, ?, ?)
		`,
		roleAssignment.ID.String(),
		roleAssignment.WorkspaceID.String(),
		roleAssignment.UserID,
		string(roleAssignment.Role),
		roleAssignment.CreatedBy,
		roleAssignment.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert workspace role assignment: %w", err)
	}

	return nil
}

/*
workspaceRecord represents a row from campfire_workspaces.
*/
type workspaceRecord struct {
	ID          string `db:"id"`
	TeamID      string `db:"team_id"`
	ChannelID   string `db:"channel_id"`
	Name        string `db:"name"`
	Description string `db:"description"`
	BoardURL    string `db:"board_url"`
	Timezone    string `db:"timezone"`
	CreatedBy   string `db:"created_by"`
	CreatedAt   string `db:"created_at"`
	UpdatedAt   string `db:"updated_at"`
	IsArchived  bool   `db:"is_archived"`
}

/*
toDomain maps a workspace database record to the domain model.
*/
func (r workspaceRecord) toDomain() domain.Workspace {
	return domain.Workspace{
		ID:          domain.ID(r.ID),
		TeamID:      r.TeamID,
		ChannelID:   r.ChannelID,
		Name:        r.Name,
		Description: r.Description,
		BoardURL:    r.BoardURL,
		Timezone:    r.Timezone,
		CreatedBy:   r.CreatedBy,
		CreatedAt:   parseStoredTime(r.CreatedAt),
		UpdatedAt:   parseStoredTime(r.UpdatedAt),
		IsArchived:  r.IsArchived,
	}
}
