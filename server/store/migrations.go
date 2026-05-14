package store

import (
	"embed"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/pressly/goose/v3"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

/*
RunMigrations applies Campfire SQL migrations.

Migrations are embedded into the plugin binary so the installed plugin bundle
does not need to read SQL files from the filesystem at runtime.
*/
func RunMigrations(database *Database) error {
	if database == nil || database.DB == nil {
		return fmt.Errorf("database is not connected")
	}

	dialect, err := gooseDialect(database.DriverName)
	if err != nil {
		return err
	}

	goose.SetBaseFS(migrationsFS)

	if err := goose.SetDialect(dialect); err != nil {
		return fmt.Errorf("set migration dialect: %w", err)
	}

	if err := goose.Up(database.DB.DB, "migrations"); err != nil {
		return fmt.Errorf("run migrations: %w", err)
	}

	return nil
}

/*
MigrationDB returns the raw SQL connection used by goose.

This helper keeps the sqlx dependency explicit for future migration tests.
*/
func MigrationDB(db *sqlx.DB) *sqlx.DB {
	return db
}

/*
gooseDialect maps Mattermost SQL driver names to goose dialect names.
*/
func gooseDialect(driverName string) (string, error) {
	switch driverName {
	case "postgres":
		return "postgres", nil
	case "mysql":
		return "mysql", nil
	default:
		return "", fmt.Errorf("unsupported migration dialect for driver %q", driverName)
	}
}
