-- +goose Up

CREATE TABLE IF NOT EXISTS campfire_leave_types (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(64) NOT NULL,
    color VARCHAR(32) NOT NULL,
    requires_approval BOOLEAN NOT NULL,
    is_active BOOLEAN NOT NULL,
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_campfire_leave_types_workspace
        FOREIGN KEY (workspace_id)
        REFERENCES campfire_workspaces(id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX ux_campfire_leave_types_workspace_code
    ON campfire_leave_types(workspace_id, code);

CREATE TABLE IF NOT EXISTS campfire_leave_requests (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    leave_type_id VARCHAR(36) NOT NULL,
    start_date VARCHAR(10) NOT NULL,
    end_date VARCHAR(10) NOT NULL,
    duration_mode VARCHAR(32) NOT NULL,
    half_day_part VARCHAR(32) NOT NULL,
    start_time VARCHAR(5) NOT NULL,
    end_time VARCHAR(5) NOT NULL,
    reason TEXT NOT NULL,
    backup_user_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    cancelled_at TIMESTAMP NULL,

    CONSTRAINT fk_campfire_leave_requests_workspace
        FOREIGN KEY (workspace_id)
        REFERENCES campfire_workspaces(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_campfire_leave_requests_leave_type
        FOREIGN KEY (leave_type_id)
        REFERENCES campfire_leave_types(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_campfire_leave_requests_workspace_user_dates
    ON campfire_leave_requests(workspace_id, user_id, start_date, end_date);

CREATE INDEX idx_campfire_leave_requests_workspace_status
    ON campfire_leave_requests(workspace_id, status);

CREATE INDEX idx_campfire_leave_requests_user_status
    ON campfire_leave_requests(user_id, status);

CREATE INDEX idx_campfire_leave_requests_dates
    ON campfire_leave_requests(start_date, end_date);

CREATE TABLE IF NOT EXISTS campfire_leave_decisions (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    leave_request_id VARCHAR(36) NOT NULL,
    workspace_id VARCHAR(36) NOT NULL,
    decided_by VARCHAR(64) NOT NULL,
    decision VARCHAR(32) NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_campfire_leave_decisions_request
        FOREIGN KEY (leave_request_id)
        REFERENCES campfire_leave_requests(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_campfire_leave_decisions_workspace
        FOREIGN KEY (workspace_id)
        REFERENCES campfire_workspaces(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_campfire_leave_decisions_request
    ON campfire_leave_decisions(leave_request_id);

-- +goose Down

DROP TABLE IF EXISTS campfire_leave_decisions;
DROP TABLE IF EXISTS campfire_leave_requests;
DROP TABLE IF EXISTS campfire_leave_types;