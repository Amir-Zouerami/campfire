-- +goose Up

CREATE TABLE IF NOT EXISTS campfire_report_runs (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    report_rule_id VARCHAR(36) NOT NULL,
    schedule_id VARCHAR(36) NOT NULL,
    report_kind VARCHAR(32) NOT NULL,
    period_start VARCHAR(10) NOT NULL,
    period_end VARCHAR(10) NOT NULL,
    generated_at TIMESTAMP NOT NULL,
    posted_at TIMESTAMP NULL,
    posted_by VARCHAR(64) NOT NULL,
    mattermost_post_id VARCHAR(64) NOT NULL,
    markdown TEXT NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_campfire_report_runs_workspace
        FOREIGN KEY (workspace_id)
        REFERENCES campfire_workspaces(id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_campfire_report_runs_rule_period
    ON campfire_report_runs(workspace_id, report_rule_id, report_kind, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_campfire_report_runs_workspace_kind_period
    ON campfire_report_runs(workspace_id, report_kind, period_start, period_end);

CREATE TABLE IF NOT EXISTS campfire_notification_runs (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    reminder_rule_id VARCHAR(36) NOT NULL,
    schedule_id VARCHAR(36) NOT NULL,
    notification_kind VARCHAR(64) NOT NULL,
    occurrence_date VARCHAR(10) NOT NULL,
    sequence_number INTEGER NOT NULL,
    target_user_id VARCHAR(64) NOT NULL,
    mattermost_post_id VARCHAR(64) NOT NULL,
    sent_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_campfire_notification_runs_workspace
        FOREIGN KEY (workspace_id)
        REFERENCES campfire_workspaces(id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_campfire_notification_runs_unique_sequence
    ON campfire_notification_runs(
        workspace_id,
        reminder_rule_id,
        schedule_id,
        occurrence_date,
        sequence_number,
        target_user_id,
        notification_kind
    );

CREATE INDEX IF NOT EXISTS idx_campfire_notification_runs_workspace_schedule_date
    ON campfire_notification_runs(workspace_id, schedule_id, occurrence_date);

CREATE TABLE IF NOT EXISTS campfire_saved_report_filters (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    scope VARCHAR(32) NOT NULL,
    report_type VARCHAR(32) NOT NULL,
    filter_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_campfire_saved_report_filters_user_scope
    ON campfire_saved_report_filters(user_id, scope);

CREATE INDEX IF NOT EXISTS idx_campfire_saved_report_filters_workspace_type
    ON campfire_saved_report_filters(workspace_id, report_type);

-- +goose Down

DROP TABLE IF EXISTS campfire_saved_report_filters;
DROP TABLE IF EXISTS campfire_notification_runs;
DROP TABLE IF EXISTS campfire_report_runs;