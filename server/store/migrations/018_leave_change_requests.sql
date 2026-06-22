-- +goose Up

CREATE TABLE IF NOT EXISTS campfire_leave_change_requests (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    leave_request_id VARCHAR(36) NOT NULL,
    workspace_id VARCHAR(36) NOT NULL,
    requester_user_id VARCHAR(64) NOT NULL,
    leave_type_id VARCHAR(36) NOT NULL,
    start_date VARCHAR(10) NOT NULL,
    end_date VARCHAR(10) NOT NULL,
    duration_mode VARCHAR(32) NOT NULL,
    half_day_part VARCHAR(32) NOT NULL,
    start_time VARCHAR(5) NOT NULL,
    end_time VARCHAR(5) NOT NULL,
    reason TEXT NOT NULL,
    backup_user_id VARCHAR(64) NOT NULL,
    can_contact_if_needed BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(32) NOT NULL,
    created_by VARCHAR(64) NOT NULL,
    decided_by VARCHAR(64) NOT NULL,
    decision_comment TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    decided_at TIMESTAMP NULL,

    CONSTRAINT fk_campfire_leave_change_requests_leave_request
        FOREIGN KEY (leave_request_id)
        REFERENCES campfire_leave_requests(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_campfire_leave_change_requests_workspace
        FOREIGN KEY (workspace_id)
        REFERENCES campfire_workspaces(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_campfire_leave_change_requests_leave_type
        FOREIGN KEY (leave_type_id)
        REFERENCES campfire_leave_types(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_campfire_leave_change_requests_workspace_status
    ON campfire_leave_change_requests(workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_campfire_leave_change_requests_leave_request_status
    ON campfire_leave_change_requests(leave_request_id, status);

CREATE INDEX IF NOT EXISTS idx_campfire_leave_change_requests_requester_status
    ON campfire_leave_change_requests(requester_user_id, status);

-- +goose Down

DROP TABLE IF EXISTS campfire_leave_change_requests;
