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

	roleValues := make([]string, 0, len(roles))
	for _, role := range roles {
		roleValues = append(roleValues, string(role))
	}

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
