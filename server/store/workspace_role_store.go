package store

import (
	"context"
	"fmt"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/jmoiron/sqlx"
)

/*
WorkspaceRoleStore defines persistence operations for workspace role lookups.
*/
type WorkspaceRoleStore interface {
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
rolesToStrings maps domain roles to string values for SQL queries.
*/
func rolesToStrings(roles []domain.Role) []string {
	roleValues := make([]string, 0, len(roles))

	for _, role := range roles {
		roleValues = append(roleValues, string(role))
	}

	return roleValues
}
