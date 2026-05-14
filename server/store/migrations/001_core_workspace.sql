-- +goose Up

CREATE TABLE IF NOT EXISTS campfire_workspaces (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    team_id VARCHAR(64) NOT NULL,
    channel_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    board_url TEXT NOT NULL,
    timezone VARCHAR(128) NOT NULL,
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_campfire_workspaces_channel_id
    ON campfire_workspaces(channel_id);

CREATE INDEX idx_campfire_workspaces_team_id
    ON campfire_workspaces(team_id);

CREATE INDEX idx_campfire_workspaces_is_archived
    ON campfire_workspaces(is_archived);

CREATE TABLE IF NOT EXISTS campfire_workspace_working_days (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    weekday INTEGER NOT NULL,
    enabled BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_campfire_workspace_working_days_workspace
        FOREIGN KEY (workspace_id)
        REFERENCES campfire_workspaces(id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX ux_campfire_workspace_working_days_workspace_weekday
    ON campfire_workspace_working_days(workspace_id, weekday);

CREATE TABLE IF NOT EXISTS campfire_workspace_skip_dates (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    date VARCHAR(10) NOT NULL,
    label VARCHAR(255) NOT NULL,
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_campfire_workspace_skip_dates_workspace
        FOREIGN KEY (workspace_id)
        REFERENCES campfire_workspaces(id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX ux_campfire_workspace_skip_dates_workspace_date
    ON campfire_workspace_skip_dates(workspace_id, date);

CREATE TABLE IF NOT EXISTS campfire_workspace_role_settings (
    workspace_id VARCHAR(36) NOT NULL PRIMARY KEY,
    channel_admins_are_leads BOOLEAN NOT NULL,
    system_admins_are_admins BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_campfire_workspace_role_settings_workspace
        FOREIGN KEY (workspace_id)
        REFERENCES campfire_workspaces(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS campfire_workspace_role_assignments (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    role VARCHAR(32) NOT NULL,
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_campfire_workspace_role_assignments_workspace
        FOREIGN KEY (workspace_id)
        REFERENCES campfire_workspaces(id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX ux_campfire_workspace_role_assignments_workspace_user_role
    ON campfire_workspace_role_assignments(workspace_id, user_id, role);

CREATE INDEX idx_campfire_workspace_role_assignments_user
    ON campfire_workspace_role_assignments(user_id);

CREATE TABLE IF NOT EXISTS campfire_audit_log (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    actor_user_id VARCHAR(64) NOT NULL,
    action VARCHAR(128) NOT NULL,
    entity_type VARCHAR(128) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    metadata_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_campfire_audit_log_workspace_created
    ON campfire_audit_log(workspace_id, created_at);

CREATE INDEX idx_campfire_audit_log_actor_created
    ON campfire_audit_log(actor_user_id, created_at);

-- +goose Down

DROP TABLE IF EXISTS campfire_audit_log;
DROP TABLE IF EXISTS campfire_workspace_role_assignments;
DROP TABLE IF EXISTS campfire_workspace_role_settings;
DROP TABLE IF EXISTS campfire_workspace_skip_dates;
DROP TABLE IF EXISTS campfire_workspace_working_days;
DROP TABLE IF EXISTS campfire_workspaces;