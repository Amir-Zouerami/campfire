# Migration safety notes

Campfire migrations are stored in the plugin-owned `campfire_goose_db_version`
table. They intentionally do not use Goose's default `goose_db_version` table so
Mattermost core migrations or other plugins cannot mark Campfire versions as
applied by accident.

## Idempotency rules

New Campfire migrations should be safe to retry after a failed deploy:

- `CREATE TABLE` statements must use `IF NOT EXISTS`.
- `CREATE INDEX` and `CREATE UNIQUE INDEX` statements must use `IF NOT EXISTS`.
- `ALTER TABLE ... ADD COLUMN` statements must use `IF NOT EXISTS` when the
  target database dialect supports the syntax already used by this project.
- `DROP TABLE` and `DROP COLUMN` statements in down migrations must use
  `IF EXISTS` when available.
- Data backfill statements must be scoped so running them more than once does
  not corrupt user data.
- Destructive data fixes must be forward-only unless the previous value can be
  recovered safely.

## Historical migration caution

The earliest table-creation migrations now use `CREATE INDEX IF NOT EXISTS` so a
partially restored local/dev database can recover when tables and indexes exist
but the `campfire_goose_db_version` ledger is missing or stale. This protects the
upgrade path from duplicate-index failures during plugin restart.

If a partially restored database is suspected, inspect both the Campfire tables
and `campfire_goose_db_version` before starting the plugin. A clean reset should
remove all `campfire_%` tables, including the migration ledger, then let the
plugin recreate them from scratch.
