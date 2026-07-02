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

	if err := ensureScheduleScopedStandupSubmissionIndex(database); err != nil {
		return fmt.Errorf("ensure standup submission index: %w", err)
	}

	return nil
}

/*
ensureScheduleScopedStandupSubmissionIndex upgrades the original submission
uniqueness contract from template-scoped to schedule-scoped storage.

The first Campfire standup migration allowed only one submission per
workspace/template/user/date. That made two different schedules sharing a
standup template overwrite each other. This maintenance step runs after Goose so
it can use database-driver-specific index DDL while remaining idempotent across
Postgres and MySQL.
*/
func ensureScheduleScopedStandupSubmissionIndex(database *Database) error {
	if database == nil || database.DB == nil {
		return fmt.Errorf("database is not connected")
	}

	const tableName = "campfire_standup_submissions"
	const oldIndexName = "ux_campfire_standup_submissions_unique_occurrence"
	const newIndexName = "ux_campfire_standup_submissions_schedule_occurrence"

	oldIndexExists, err := sqlIndexExists(database, tableName, oldIndexName)
	if err != nil {
		return err
	}

	if oldIndexExists {
		if err := dropSQLIndex(database, tableName, oldIndexName); err != nil {
			return err
		}
	}

	newIndexExists, err := sqlIndexExists(database, tableName, newIndexName)
	if err != nil {
		return err
	}

	if newIndexExists {
		return nil
	}

	_, err = database.DB.Exec(`
		CREATE UNIQUE INDEX ux_campfire_standup_submissions_schedule_occurrence
		ON campfire_standup_submissions(workspace_id, template_id, schedule_id, user_id, occurrence_date)
	`)
	if err != nil {
		return fmt.Errorf("create schedule-scoped standup submission index: %w", err)
	}

	return nil
}

/*
sqlIndexExists reports whether an index exists for the configured SQL driver.
*/
func sqlIndexExists(database *Database, tableName string, indexName string) (bool, error) {
	var count int

	switch database.DriverName {
	case "postgres":
		err := database.DB.Get(&count, `
			SELECT COUNT(*)
			FROM pg_indexes
			WHERE schemaname = current_schema()
				AND tablename = $1
				AND indexname = $2
		`, tableName, indexName)
		if err != nil {
			return false, fmt.Errorf("inspect postgres index %s: %w", indexName, err)
		}

	case "mysql":
		err := database.DB.Get(&count, `
			SELECT COUNT(*)
			FROM information_schema.statistics
			WHERE table_schema = DATABASE()
				AND table_name = ?
				AND index_name = ?
		`, tableName, indexName)
		if err != nil {
			return false, fmt.Errorf("inspect mysql index %s: %w", indexName, err)
		}

	default:
		return false, fmt.Errorf("unsupported index inspection dialect %q", database.DriverName)
	}

	return count > 0, nil
}

/*
dropSQLIndex drops one known index using database-specific syntax.
*/
func dropSQLIndex(database *Database, tableName string, indexName string) error {
	var statement string

	switch database.DriverName {
	case "postgres":
		statement = "DROP INDEX IF EXISTS " + indexName
	case "mysql":
		statement = "DROP INDEX " + indexName + " ON " + tableName
	default:
		return fmt.Errorf("unsupported index drop dialect %q", database.DriverName)
	}

	if _, err := database.DB.Exec(statement); err != nil {
		return fmt.Errorf("drop sql index %s: %w", indexName, err)
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
