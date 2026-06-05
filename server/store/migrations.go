package store

import (
	"embed"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/pressly/goose/v3"
)

const campfireMigrationTableName = "campfire_goose_db_version"

//go:embed migrations/*.sql
var migrationsFS embed.FS

/*
RunMigrations applies Campfire SQL migrations.

Migrations are embedded into the plugin binary so the installed plugin bundle
does not need to read SQL files from the filesystem at runtime.

Campfire must not use Goose's default `goose_db_version` table inside the
Mattermost database. Mattermost is a shared database and other plugins/tools may
also use Goose. Using the default table lets an unrelated or stale migration
version, such as version 10, make Goose believe Campfire is already at that
version and then fail with "missing migrations before current version".

The plugin-owned table below keeps Campfire migration state isolated and makes
full clean resets deterministic: dropping `campfire_%` tables also drops the
Campfire migration ledger.
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
	goose.SetTableName(campfireMigrationTableName)

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
