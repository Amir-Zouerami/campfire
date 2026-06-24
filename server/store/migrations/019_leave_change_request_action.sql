-- +goose Up

ALTER TABLE campfire_leave_change_requests
    ADD COLUMN IF NOT EXISTS action VARCHAR(32) NOT NULL DEFAULT 'edit';

CREATE INDEX IF NOT EXISTS idx_campfire_leave_change_requests_action_status
    ON campfire_leave_change_requests(action, status);

-- +goose Down

DROP INDEX IF EXISTS idx_campfire_leave_change_requests_action_status;

ALTER TABLE campfire_leave_change_requests
    DROP COLUMN IF EXISTS action;
