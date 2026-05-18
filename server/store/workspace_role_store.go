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
WorkspaceRoleStore defines persistence operations for workspace role lookups.
*/
type WorkspaceRoleStore interface {
	GetSettings(ctx context.Context, workspaceID domain.ID) (*domain.WorkspaceRoleSettings, error)
	ListUserIDsByRoles(ctx context.Context, workspaceID domain.ID, roles []domain.Role) ([]string, error)
	UserHasAnyRole(ctx context.Context, workspaceID domain.ID, userID string, roles []domain.Role) (bool, error)
}

/*
SQLWorkspaceRoleStore persists and reads workspace role assignments from SQL.
*/
type SQLWorkspaceRoleStore struct {
	db *sqlx.DB
}

/*
NewSQLWorkspaceRoleStore creates a SQL-backed workspace role store.
*/
func NewSQLWorkspaceRoleStore(database *Database) *SQLWorkspaceRoleStore {
	return &SQLWorkspaceRoleStore{
		db: database.DB,
	}
}

/*
GetSettings returns workspace role behavior settings.
*/
func (s *SQLWorkspaceRoleStore) GetSettings(
	ctx context.Context,
	workspaceID domain.ID,
) (*domain.WorkspaceRoleSettings, error) {
	var record workspaceRoleSettingsRecord

	query := s.db.Rebind(`
		SELECT
			workspace_id,
			channel_admins_are_leads,
			system_admins_are_admins,
			created_at,
			updated_at
		FROM campfire_workspace_role_settings
		WHERE workspace_id = ?
		LIMIT 1
	`)

	err := s.db.GetContext(ctx, &record, query, workspaceID.String())
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}

		return nil, fmt.Errorf("get workspace role settings: %w", err)
	}

	settings := record.toDomain()

	return &settings, nil
}

/*
ListUserIDsByRoles returns unique user IDs assigned to any of the requested roles.
*/
func (s *SQLWorkspaceRoleStore) ListUserIDsByRoles(
	ctx context.Context,
	workspaceID domain.ID,
	roles []domain.Role,
) ([]string, error) {
	if len(roles) == 0 {
		return []string{}, nil
	}

	roleValues := rolesToStrings(roles)

	query, args, err := sqlx.In(
		`
		SELECT DISTINCT user_id
		FROM campfire_workspace_role_assignments
		WHERE workspace_id = ? AND role IN (?)
		ORDER BY user_id ASC
		`,
		workspaceID.String(),
		roleValues,
	)
	if err != nil {
		return nil, fmt.Errorf("build workspace role query: %w", err)
	}

	query = s.db.Rebind(query)

	userIDs := []string{}
	if err := s.db.SelectContext(ctx, &userIDs, query, args...); err != nil {
		return nil, fmt.Errorf("list workspace role user ids: %w", err)
	}

	return userIDs, nil
}

/*
UserHasAnyRole returns true when a user has at least one of the requested roles.
*/
func (s *SQLWorkspaceRoleStore) UserHasAnyRole(
	ctx context.Context,
	workspaceID domain.ID,
	userID string,
	roles []domain.Role,
) (bool, error) {
	if len(roles) == 0 {
		return false, nil
	}

	roleValues := rolesToStrings(roles)

	query, args, err := sqlx.In(
		`
		SELECT COUNT(1)
		FROM campfire_workspace_role_assignments
		WHERE workspace_id = ? AND user_id = ? AND role IN (?)
		`,
		workspaceID.String(),
		userID,
		roleValues,
	)
	if err != nil {
		return false, fmt.Errorf("build workspace role existence query: %w", err)
	}

	query = s.db.Rebind(query)

	var count int
	if err := s.db.GetContext(ctx, &count, query, args...); err != nil {
		return false, fmt.Errorf("check workspace role existence: %w", err)
	}

	return count > 0, nil
}

/*
workspaceRoleSettingsRecord represents a row from campfire_workspace_role_settings.
*/
type workspaceRoleSettingsRecord struct {
	WorkspaceID           string    `db:"workspace_id"`
	ChannelAdminsAreLeads bool      `db:"channel_admins_are_leads"`
	SystemAdminsAreAdmins bool      `db:"system_admins_are_admins"`
	CreatedAt             time.Time `db:"created_at"`
	UpdatedAt             time.Time `db:"updated_at"`
}

/*
toDomain maps a role settings record to the domain model.
*/
func (r workspaceRoleSettingsRecord) toDomain() domain.WorkspaceRoleSettings {
	return domain.WorkspaceRoleSettings{
		WorkspaceID:           domain.ID(r.WorkspaceID),
		ChannelAdminsAreLeads: r.ChannelAdminsAreLeads,
		SystemAdminsAreAdmins: r.SystemAdminsAreAdmins,
		CreatedAt:             parseStoredTime(r.CreatedAt),
		UpdatedAt:             parseStoredTime(r.UpdatedAt),
	}
}

/*
rolesToStrings maps domain roles to string values for SQL queries.
*/
func rolesToStrings(roles []domain.Role) []string {
	roleValues := make([]string, 0, len(roles))

	for _, role := range roles {
		roleValues = append(roleValues, string(role))
	}

	return roleValues
}
