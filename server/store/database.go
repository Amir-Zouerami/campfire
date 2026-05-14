package store

import (
	"fmt"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/mattermost/mattermost/server/public/plugin"
)

/*
Database owns Campfire's SQL connection.

Campfire opens a SQL connection using Mattermost's configured database settings
so reporting data lives in the same database as the Mattermost deployment.
*/
type Database struct {
	DB         *sqlx.DB
	DriverName string
}

/*
OpenMattermostDatabase opens a SQL connection using Mattermost's SQL settings.
*/
func OpenMattermostDatabase(api plugin.API) (*Database, error) {
	config := api.GetUnsanitizedConfig()
	if config == nil {
		return nil, fmt.Errorf("mattermost config is unavailable")
	}

	if config.SqlSettings.DriverName == nil {
		return nil, fmt.Errorf("mattermost SqlSettings.DriverName is not configured")
	}

	if config.SqlSettings.DataSource == nil {
		return nil, fmt.Errorf("mattermost SqlSettings.DataSource is not configured")
	}

	driverName := strings.TrimSpace(*config.SqlSettings.DriverName)
	dataSource := strings.TrimSpace(*config.SqlSettings.DataSource)

	if driverName == "" {
		return nil, fmt.Errorf("mattermost SqlSettings.DriverName is empty")
	}

	if dataSource == "" {
		return nil, fmt.Errorf("mattermost SqlSettings.DataSource is empty")
	}

	if !isSupportedDriver(driverName) {
		return nil, fmt.Errorf("unsupported Mattermost SQL driver %q", driverName)
	}

	db, err := sqlx.Open(driverName, dataSource)
	if err != nil {
		return nil, fmt.Errorf("open Mattermost database: %w", err)
	}

	db.SetConnMaxLifetime(30 * time.Minute)
	db.SetMaxIdleConns(5)
	db.SetMaxOpenConns(10)

	if err := db.Ping(); err != nil {
		closeErr := db.Close()
		if closeErr != nil {
			return nil, fmt.Errorf("ping Mattermost database: %w; close failed: %v", err, closeErr)
		}

		return nil, fmt.Errorf("ping Mattermost database: %w", err)
	}

	return &Database{
		DB:         db,
		DriverName: driverName,
	}, nil
}

/*
Close closes the Campfire SQL connection.
*/
func (d *Database) Close() error {
	if d == nil || d.DB == nil {
		return nil
	}

	return d.DB.Close()
}

/*
isSupportedDriver returns true when Campfire has registered a SQL driver.
*/
func isSupportedDriver(driverName string) bool {
	switch driverName {
	case "postgres", "mysql":
		return true
	default:
		return false
	}
}
