# Campfire

Campfire is a modern Mattermost team operations plugin for async standups, leave planning, task time tracking, and global reporting.

## Vision

Campfire helps teams gather around a shared operational rhythm:

- async daily standups
- weekly summaries
- task-level time tracking
- leave requests and approvals
- team availability
- Markdown reports
- global reporting dashboards

## Plugin identity

```text
Mattermost plugin ID: dev.zouerami.campfire
GitHub module: github.com/amir-zouerami/campfire
Homepage: https://github.com/amir-zouerami/campfire
Support: https://github.com/amir-zouerami/campfire/issues
```

## Status

Campfire is in early MVP development.

## Architecture

Campfire is built as a clean Mattermost plugin:

- Go backend
- React 18 frontend
- SQL-backed reporting
- clean service/store/domain separation
- warm modern UI

# Campfire SQL migrations

Campfire stores reportable product data in SQL tables with the `campfire_` prefix.

## Migration order

1. `001_core_workspace.sql`
2. `002_standups.sql`
3. `003_tasks_time.sql`
4. `004_leaves.sql`
5. `005_reports_notifications.sql`

## Notes

These files define the target Campfire schema before the runtime database connection is wired.

The Mattermost public plugin API exposes KV-store helpers but does not expose a direct database handle through the `plugin.API` interface. Campfire will keep storage behind interfaces so the runtime database connection strategy can be selected without changing services or handlers.

## Important

Do not store analytics-heavy Campfire data only in Mattermost KV storage.

KV can be used later for lightweight plugin metadata, but workspaces, standups, tasks, time entries, leaves, reports, notification runs, saved filters, and audit logs belong in SQL.

## Repository

https://github.com/amir-zouerami/campfire
